using System.Net;
using Alerta360.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Alerta360.Tests;

public class NotificationServiceTests
{
    private sealed class StubHandler : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest;
        public string? LastBody;
        public int CallCount;
        public HttpStatusCode ResponseStatus = HttpStatusCode.OK;
        public string ResponseBody = "{\"ok\":true}";

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            CallCount++;
            LastRequest = request;
            LastBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            return new HttpResponseMessage(ResponseStatus)
            {
                Content = new StringContent(ResponseBody)
            };
        }
    }

    private static (NotificationService svc, StubHandler handler) Create(string? token = null, string? chatId = null)
    {
        var handler = new StubHandler();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Notifications:Telegram:BotToken"] = token,
                ["Notifications:Telegram:ChatId"] = chatId
            })
            .Build();
        var svc = new NotificationService(
            new HttpClient(handler), config, NullLogger<NotificationService>.Instance);
        return (svc, handler);
    }

    [Fact]
    public async Task AntiSpam_SuprimeSegundoIntentoDentroDe30Min()
    {
        var (notify, _) = Create();
        var assetId = Guid.NewGuid();

        Assert.True(await notify.TryNotifyAsync(assetId, "Sensor 1", "Healthy", "Critical", "score=55"));
        Assert.False(await notify.TryNotifyAsync(assetId, "Sensor 1", "DegradedMinor", "Critical", "score=55"));
    }

    [Fact]
    public async Task CambioDeEstado_NoSeSuprime()
    {
        var (notify, _) = Create();
        var assetId = Guid.NewGuid();

        Assert.True(await notify.TryNotifyAsync(assetId, "Sensor 1", "Healthy", "Critical", "score=55"));
        Assert.True(await notify.TryNotifyAsync(assetId, "Sensor 1", "Critical", "Healthy", "recuperado"));
    }

    [Fact]
    public async Task ActivosDistintos_NoSeSuprimenEntreSi()
    {
        var (notify, _) = Create();

        Assert.True(await notify.TryNotifyAsync(Guid.NewGuid(), "Sensor 1", "Healthy", "Critical", "r"));
        Assert.True(await notify.TryNotifyAsync(Guid.NewGuid(), "Sensor 2", "Healthy", "Critical", "r"));
    }

    [Fact]
    public async Task SinTelegramConfigurado_SoloLoguea_NoFalla()
    {
        var (notify, handler) = Create();

        Assert.True(await notify.TryNotifyAsync(Guid.NewGuid(), "Sensor 1", "Healthy", "Critical", "r"));
        Assert.Equal(0, handler.CallCount); // sin token no hay HTTP
    }

    [Fact]
    public async Task ConTelegramConfigurado_EnviaChatIdYTexto()
    {
        var (notify, handler) = Create(token: "123:ABC", chatId: "-10042");

        var ok = await notify.TryNotifyAsync(Guid.NewGuid(), "Inclinómetro 01", "Healthy", "Critical", "score=55");

        Assert.True(ok);
        Assert.Equal(1, handler.CallCount);
        Assert.Contains("bot123:ABC/sendMessage", handler.LastRequest!.RequestUri!.ToString());
        var body = System.Net.WebUtility.UrlDecode(handler.LastBody!); // form-urlencoded
        Assert.Contains("chat_id=-10042", body);
        Assert.Contains("Inclin", body);
        Assert.Contains("Healthy -> Critical", body);
        Assert.Equal("application/x-www-form-urlencoded", handler.LastRequest.Content!.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task TelegramFalla_DevuelveFalse_NoConsumeVentana_Reintenta()
    {
        var (notify, handler) = Create(token: "123:ABC", chatId: "-10042");
        handler.ResponseStatus = HttpStatusCode.InternalServerError;
        var assetId = Guid.NewGuid();

        Assert.False(await notify.TryNotifyAsync(assetId, "Sensor 1", "Healthy", "Critical", "r"));
        Assert.False(await notify.TryNotifyAsync(assetId, "Sensor 1", "Healthy", "Critical", "r"));
        Assert.Equal(2, handler.CallCount); // no consume la ventana anti-spam en fallo
    }

    [Fact]
    public async Task TrasFallo_YaConfigurado_Exitoso_ConsumeVentana()
    {
        var (notify, handler) = Create(token: "123:ABC", chatId: "-10042");
        handler.ResponseStatus = HttpStatusCode.InternalServerError;
        var assetId = Guid.NewGuid();

        Assert.False(await notify.TryNotifyAsync(assetId, "Sensor 1", "Healthy", "Critical", "r"));
        handler.ResponseStatus = HttpStatusCode.OK;
        Assert.True(await notify.TryNotifyAsync(assetId, "Sensor 1", "Healthy", "Critical", "r"));
        Assert.False(await notify.TryNotifyAsync(assetId, "Sensor 1", "Healthy", "Critical", "r"));
        Assert.Equal(2, handler.CallCount);
    }
}
