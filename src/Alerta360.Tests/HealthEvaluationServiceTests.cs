using Alerta360.Api.Data;
using Alerta360.Api.Models;
using Alerta360.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Alerta360.Tests;

public class HealthEvaluationServiceTests : IDisposable
{
    private readonly Alerta360DbContext _db;
    private readonly HealthEvaluationService _svc;
    private readonly Client _client;

    public HealthEvaluationServiceTests()
    {
        var options = new DbContextOptionsBuilder<Alerta360DbContext>()
            .UseInMemoryDatabase($"alerta360-tests-{Guid.NewGuid()}")
            .Options;
        _db = new Alerta360DbContext(options);
        _svc = new HealthEvaluationService(
            _db,
            new NotificationService(NullLogger<NotificationService>.Instance),
            NullLogger<HealthEvaluationService>.Instance);
        _client = new Client { Name = "Cliente test" };
        _db.Clients.Add(_client);
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private Asset AddAsset(bool isCritical = false)
    {
        var asset = new Asset
        {
            ExternalId = $"S-{Guid.NewGuid():N}"[..12],
            Name = "Sensor de prueba",
            IsCritical = isCritical,
            ClientId = _client.Id,
        };
        _db.Assets.Add(asset);
        _db.SaveChanges();
        return asset;
    }

    private void AddReadings(Asset asset, params (decimal value, int minutesAgo)[] readings)
    {
        foreach (var (value, minutesAgo) in readings)
        {
            var at = DateTime.UtcNow.AddMinutes(-minutesAgo);
            _db.TelemetryReadings.Add(new TelemetryReading
            {
                AssetId = asset.Id,
                ReceivedAt = at,
                MeasuredAt = at,
                ParsedValue = value,
                IsValid = true,
            });
        }
        _db.SaveChanges();
    }

    private async Task<HealthScoreSnapshot> EvaluateAsync(Asset asset)
    {
        await _svc.EvaluateAssetAsync(asset);
        await _db.SaveChangesAsync();
        return await _db.HealthScores
            .Where(h => h.AssetId == asset.Id)
            .OrderByDescending(h => h.CalculatedAt)
            .FirstAsync();
    }

    [Fact]
    public async Task LecturasRecientesVariadas_Saludable()
    {
        var asset = AddAsset();
        AddReadings(asset,
            (10m, 0), (11m, 1), (12m, 2), (13m, 3), (14m, 4), (15m, 5));

        var snap = await EvaluateAsync(asset);

        Assert.Equal(AssetStatus.Healthy, snap.Status);
        Assert.Equal(100, snap.ScoreTotal);
        Assert.Equal(100, snap.ScoreDisponibilidad);
        Assert.Equal(100, snap.ScoreFrescura);
        Assert.Equal(100, snap.ScoreCalidad);
        Assert.Equal(100, snap.ScoreConsistencia);
        Assert.Equal(100, snap.ScoreComunicacion);
        Assert.Equal(AssetStatus.Healthy, asset.Status);
    }

    [Fact]
    public async Task DatoCongelado_VetoDataUnreliable_NuncaSaludable()
    {
        var asset = AddAsset();
        AddReadings(asset, (12.4m, 10), (12.4m, 5), (12.4m, 0));

        var snap = await EvaluateAsync(asset);

        Assert.Equal(AssetStatus.DataUnreliable, snap.Status);
        Assert.Equal(0, snap.ScoreConsistencia);
        Assert.Equal(AssetStatus.DataUnreliable, asset.Status);

        var incident = await _db.Incidents.SingleAsync(i => i.AssetId == asset.Id);
        Assert.Equal(IncidentEventType.DataUnreliable, incident.EventType);
    }

    [Fact]
    public async Task ValorFueraDeRango_VetoDataUnreliable()
    {
        var asset = AddAsset();
        AddReadings(asset, (10m, 5), (11m, 2), (250m, 0)); // 250 mm fuera de [-100,100]

        var snap = await EvaluateAsync(asset);

        Assert.Equal(AssetStatus.DataUnreliable, snap.Status);
        Assert.Equal(0, snap.ScoreCalidad);
    }

    [Fact]
    public async Task SinLecturas_Critical()
    {
        var asset = AddAsset();

        var snap = await EvaluateAsync(asset);

        Assert.Equal(AssetStatus.Critical, snap.Status);
        Assert.Equal(0, snap.ScoreDisponibilidad);
        Assert.Equal(0, snap.ScoreFrescura);
    }

    [Fact]
    public async Task SinTransmisionHaceUnaHora_Critical()
    {
        var asset = AddAsset();
        AddReadings(asset, (10m, 65), (20m, 60)); // solo 2 lecturas viejas: sin veto, score bajo

        var snap = await EvaluateAsync(asset);

        Assert.Equal(AssetStatus.Critical, snap.Status);
        Assert.Equal(55, snap.ScoreTotal); // 0.25*cal(100) + 0.30*cons(100)
        Assert.Equal(0, snap.ScoreComunicacion);
    }

    [Fact]
    public async Task SigueSano_NoDuplicaIncidentes()
    {
        var asset = AddAsset();
        AddReadings(asset, (10m, 0), (11m, 1), (12m, 2), (13m, 3), (14m, 4), (15m, 5));

        await EvaluateAsync(asset);
        await EvaluateAsync(asset);

        Assert.Empty(await _db.Incidents.Where(i => i.AssetId == asset.Id).ToListAsync());
    }

    [Fact]
    public async Task Capability_PonderaIsCriticalDoble()
    {
        var crit = AddAsset(isCritical: true);
        var normal = AddAsset(isCritical: false);
        _db.HealthScores.Add(new HealthScoreSnapshot { AssetId = crit.Id, ScoreTotal = 100, Status = AssetStatus.Healthy });
        _db.HealthScores.Add(new HealthScoreSnapshot { AssetId = normal.Id, ScoreTotal = 50, Status = AssetStatus.DegradedMajor });
        await _db.SaveChangesAsync();

        var score = await _svc.EvaluateCapabilityAsync(_client.Id);
        await _db.SaveChangesAsync(); // EvaluateAllAsync persiste tras llamar al motor
        var snap = await _db.CapabilitySnapshots
            .Where(c => c.ClientId == _client.Id)
            .OrderByDescending(c => c.CalculatedAt)
            .FirstAsync();

        Assert.Equal(83, score); // (100*2 + 50*1) / 3
        Assert.Equal(2, snap.AssetCount);
        Assert.Equal(1, snap.CriticalAssetCount); // count(IsCritical), no count(status Critical)
    }

    [Fact]
    public void RangeFor_Piezometro_0a500_E_Inclinometro_Menos100a100()
    {
        Assert.Equal((0, 500), HealthEvaluationService.RangeFor("talud_piezometro"));
        Assert.Equal((-100, 100), HealthEvaluationService.RangeFor("talud_inclinometro"));
        Assert.Equal((-100, 100), HealthEvaluationService.RangeFor("otro"));
    }
}
