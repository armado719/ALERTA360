namespace Alerta360.Api.Models;

public class IncidentEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AssetId { get; set; }
    public Asset? Asset { get; set; }
    public IncidentEventType EventType { get; set; }
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
    public string? Notes { get; set; }
}
