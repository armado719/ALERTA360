using System.Text.Json;

namespace Alerta360.Api.Models;

public class TelemetryReading
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AssetId { get; set; }
    public Asset? Asset { get; set; }
    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
    public DateTime MeasuredAt { get; set; }
    public JsonDocument? RawValue { get; set; }
    public decimal? ParsedValue { get; set; }
    public bool IsValid { get; set; } = true;
}
