namespace Alerta360.Api.Models;

public class Asset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ExternalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string AssetType { get; set; } = "talud_inclinometro";
    public int ExpectedIntervalSeconds { get; set; } = 300;
    public string? LocationLabel { get; set; }
    public bool IsCritical { get; set; } = false;
    public Guid ClientId { get; set; }
    public Client? Client { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Healthy;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
