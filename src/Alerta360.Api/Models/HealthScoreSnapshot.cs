namespace Alerta360.Api.Models;

public class HealthScoreSnapshot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AssetId { get; set; }
    public Asset? Asset { get; set; }
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    public int ScoreDisponibilidad { get; set; }
    public int ScoreFrescura { get; set; }
    public int ScoreCalidad { get; set; }
    public int ScoreConsistencia { get; set; }
    public int ScoreComunicacion { get; set; }
    public int ScoreTotal { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Healthy;
}
