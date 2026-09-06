namespace Alerta360.Api.Models;

public class AlertingCapabilitySnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public Client? Client { get; set; }
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    public int Score { get; set; }
    public int AssetCount { get; set; }
    public int CriticalAssetCount { get; set; }
}
