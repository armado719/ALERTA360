using System.Collections.Concurrent;

namespace Alerta360.Api.Services;

// Anti-spam de trabajo (Especificación §7): 1x/30min mismo (activo,evento); cambio de estado notifica de inmediato.
// Canal: si Notifications:Telegram está configurado, envía por Bot API; si no, solo loguea (fail-soft:
// un fallo de red/Telegram no rompe la evaluación y no consume la ventana anti-spam → se reintenta).
public class NotificationService : INotificationService
{
    private readonly ConcurrentDictionary<string, DateTime> _lastSent = new();
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(30);

    private readonly HttpClient _http;
    private readonly ILogger<NotificationService> _log;
    private readonly string? _token;
    private readonly string? _chatId;

    public NotificationService(HttpClient http, IConfiguration config, ILogger<NotificationService> log)
    {
        _http = http;
        _log = log;
        _token = config["Notifications:Telegram:BotToken"];
        _chatId = config["Notifications:Telegram:ChatId"];
    }

    private bool TelegramConfigured =>
        !string.IsNullOrWhiteSpace(_token) && !string.IsNullOrWhiteSpace(_chatId);

    public async Task<bool> TryNotifyAsync(Guid assetId, string assetName, string from, string to, string reason,
        CancellationToken ct = default)
    {
        var key = $"{assetId}:{to}";
        var now = DateTime.UtcNow;
        if (_lastSent.TryGetValue(key, out var last) && now - last < Window)
            return false; // suprimido por anti-spam (mismo estado dentro de la ventana)

        if (!TelegramConfigured)
        {
            _lastSent[key] = now;
            _log.LogWarning("NOTIFY asset={Asset} {From}->{To} razón={Reason}", assetName, from, to, reason);
            return true;
        }

        var text = $"ALERTA360\nActivo: {assetName}\nEstado: {from} -> {to}\nRazón: {reason}";
        try
        {
            using var resp = await _http.PostAsync(
                $"https://api.telegram.org/bot{_token}/sendMessage",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["chat_id"] = _chatId!,
                    ["text"] = text
                }), ct);
            if (resp.IsSuccessStatusCode)
            {
                _lastSent[key] = now;
                _log.LogWarning("NOTIFY(TG ok) asset={Asset} {From}->{To} razón={Reason}", assetName, from, to, reason);
                return true;
            }
            var body = await resp.Content.ReadAsStringAsync(ct);
            _log.LogError("Telegram rechazó ({Status}): {Body}", (int)resp.StatusCode, Truncate(Sanitize(body)));
            return false;
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _log.LogError("Telegram envío fallido: {Type}: {Message}", ex.GetType().Name, Truncate(Sanitize(ex.Message)));
            return false;
        }
    }

    // El token viaja en la URL (API de Telegram); nunca debe aparecer en logs.
    private string Sanitize(string s) =>
        string.IsNullOrEmpty(_token) ? s : s.Replace(_token, "***");

    private static string Truncate(string s) => s.Length <= 300 ? s : s[..300] + "…";
}

public interface INotificationService
{
    Task<bool> TryNotifyAsync(Guid assetId, string assetName, string from, string to, string reason,
        CancellationToken ct = default);
}
