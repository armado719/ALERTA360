using Alerta360.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Alerta360.Tests;

public class NotificationServiceTests
{
    [Fact]
    public void AntiSpam_SuprimeSegundoIntentoDentroDe30Min()
    {
        var notify = new NotificationService(NullLogger<NotificationService>.Instance);
        var assetId = Guid.NewGuid();

        Assert.True(notify.TryNotify(assetId, "Sensor 1", "Healthy", "Critical", "score=55"));
        Assert.False(notify.TryNotify(assetId, "Sensor 1", "DegradedMinor", "Critical", "score=55"));
    }

    [Fact]
    public void CambioDeEstado_NoSeSuprime()
    {
        var notify = new NotificationService(NullLogger<NotificationService>.Instance);
        var assetId = Guid.NewGuid();

        Assert.True(notify.TryNotify(assetId, "Sensor 1", "Healthy", "Critical", "score=55"));
        Assert.True(notify.TryNotify(assetId, "Sensor 1", "Critical", "Healthy", "recuperado"));
    }

    [Fact]
    public void ActivosDistintos_NoSeSuprimenEntreSi()
    {
        var notify = new NotificationService(NullLogger<NotificationService>.Instance);

        Assert.True(notify.TryNotify(Guid.NewGuid(), "Sensor 1", "Healthy", "Critical", "r"));
        Assert.True(notify.TryNotify(Guid.NewGuid(), "Sensor 2", "Healthy", "Critical", "r"));
    }
}
