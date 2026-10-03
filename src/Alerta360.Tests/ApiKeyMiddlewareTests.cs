using System.Text;
using Alerta360.Api.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Alerta360.Tests;

public class ApiKeyMiddlewareTests
{
    private const string Key = "test-key-123";

    private static ApiKeyMiddleware Create(Action<HttpContext>? nextHandler = null, string? configuredKey = Key)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Security:ApiKey"] = configuredKey
            })
            .Build();
        RequestDelegate next = nextHandler is null
            ? _ => Task.CompletedTask
            : ctx => { nextHandler(ctx); return Task.CompletedTask; };
        return new ApiKeyMiddleware(next, config);
    }

    private static DefaultHttpContext Ctx(string path, string method, string? apiKey = null)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = path;
        ctx.Request.Method = method;
        ctx.Response.Body = new MemoryStream();
        if (apiKey is not null) ctx.Request.Headers[ApiKeyMiddleware.HeaderName] = apiKey;
        return ctx;
    }

    private static string Body(DefaultHttpContext ctx)
    {
        ctx.Response.Body.Seek(0, SeekOrigin.Begin);
        using var r = new StreamReader(ctx.Response.Body, Encoding.UTF8);
        return r.ReadToEnd();
    }

    [Fact]
    public async Task DevEndpoint_SinKey_Devuelve401()
    {
        var mw = Create();
        var ctx = Ctx("/api/dev/seed", "POST");
        await mw.InvokeAsync(ctx);
        Assert.Equal(StatusCodes.Status401Unauthorized, ctx.Response.StatusCode);
        Assert.Contains("api_key_invalida", Body(ctx));
    }

    [Fact]
    public async Task DevEndpoint_ConKeyCorrecta_Pasa()
    {
        var passthrough = false;
        var mw = Create(_ => passthrough = true);
        var ctx = Ctx("/api/dev/seed", "POST", apiKey: Key);
        await mw.InvokeAsync(ctx);
        Assert.True(passthrough);
        Assert.Equal(StatusCodes.Status200OK, ctx.Response.StatusCode);
    }

    [Fact]
    public async Task DevEndpoint_KeyIncorrecta_Devuelve401()
    {
        var mw = Create();
        var ctx = Ctx("/api/dev/incidents", "GET", apiKey: "otra-key");
        await mw.InvokeAsync(ctx);
        Assert.Equal(StatusCodes.Status401Unauthorized, ctx.Response.StatusCode);
    }

    [Fact]
    public async Task SinKeyConfigurada_Devuelve503_FailClosed()
    {
        var mw = Create(configuredKey: null);
        var ctx = Ctx("/api/dev/seed", "POST", apiKey: "cualquiera");
        await mw.InvokeAsync(ctx);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, ctx.Response.StatusCode);
        Assert.Contains("api_key_no_configurada", Body(ctx));
    }

    [Fact]
    public async Task GetPublico_SinKey_Pasa()
    {
        var passthrough = false;
        var mw = Create(_ => passthrough = true);
        var ctx = Ctx("/api/assets", "GET");
        await mw.InvokeAsync(ctx);
        Assert.True(passthrough);
    }

    [Fact]
    public async Task Health_SinKey_Pasa()
    {
        var passthrough = false;
        var mw = Create(_ => passthrough = true);
        var ctx = Ctx("/health", "GET");
        await mw.InvokeAsync(ctx);
        Assert.True(passthrough);
    }

    [Fact]
    public async Task EscrituraFueraDeDev_SinKey_Devuelve401()
    {
        var mw = Create();
        var ctx = Ctx("/api/assets", "DELETE");
        await mw.InvokeAsync(ctx);
        Assert.Equal(StatusCodes.Status401Unauthorized, ctx.Response.StatusCode);
    }
}
