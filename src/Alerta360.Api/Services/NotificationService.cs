using System.Collections.Concurrent;

namespace Alerta360.Api.Services;

// Anti-spam de trabajo (Especificación §7): 1x/30min mismo (activo,evento); cambio de estado notifica de inmediato.
public class NotificationService(ILogger<NotificationService> log) : INotificationService
{
    private readonly ConcurrentDictionary<string, DateTime> _lastSent = new();
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(30);

    public bool TryNotify(Guid assetId, string assetName, string from, string to, string reason)
    {
        var key = $"{assetId}:{to}";
        var now = DateTime.UtcNow;
        if (_lastSent.TryGetValue(key, out var last) && now - last < Window)
            return false; // suprimido por anti-spam (mismo estado dentro de la ventana)
        _lastSent[key] = now;
        log.LogWarning("NOTIFY asset={Asset} {From}->{To} razón={Reason}", assetName, from, to, reason);
        return true;
    }
}

public interface INotificationService
{
    bool TryNotify(Guid assetId, string assetName, string from, string to, string reason);
}
