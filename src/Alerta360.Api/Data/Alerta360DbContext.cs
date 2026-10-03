using System.Text.Json;
using Alerta360.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Alerta360.Api.Data;

public class Alerta360DbContext(DbContextOptions<Alerta360DbContext> options) : DbContext(options)
{
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<TelemetryReading> TelemetryReadings => Set<TelemetryReading>();
    public DbSet<HealthScoreSnapshot> HealthScores => Set<HealthScoreSnapshot>();
    public DbSet<IncidentEvent> Incidents => Set<IncidentEvent>();
    public DbSet<AlertingCapabilitySnapshot> CapabilitySnapshots => Set<AlertingCapabilitySnapshot>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Asset>().HasIndex(a => new { a.ClientId, a.ExternalId }).IsUnique();
        // JsonDocument no tiene mapping nativo fuera de Npgsql; converter a string hace el modelo
        // portable (tests InMemory) sin cambiar la columna jsonb.
        b.Entity<TelemetryReading>().Property(t => t.RawValue).HasConversion(
            v => v == null ? null : v.RootElement.GetRawText(),
            s => s == null ? null : JsonDocument.Parse(s));
        b.Entity<TelemetryReading>().Property(t => t.RawValue).HasColumnType("jsonb");
        b.Entity<TelemetryReading>().HasIndex(t => new { t.AssetId, t.ReceivedAt });
        b.Entity<HealthScoreSnapshot>().HasIndex(h => new { h.AssetId, h.CalculatedAt });
    }
}
