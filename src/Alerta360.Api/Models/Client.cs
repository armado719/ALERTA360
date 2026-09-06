namespace Alerta360.Api.Models;

public class Client
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public Vertical Vertical { get; set; } = Vertical.Mineria;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
}
