using Alerta360.Api.Controllers;
using Alerta360.Api.Data;
using Alerta360.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alerta360.Tests;

public class AssetsControllerTests : IDisposable
{
    private readonly Alerta360DbContext _db;
    private readonly AssetsController _ctrl;
    private readonly Guid _assetId = Guid.NewGuid();
    private readonly Guid _otherAssetId = Guid.NewGuid();

    public AssetsControllerTests()
    {
        var options = new DbContextOptionsBuilder<Alerta360DbContext>()
            .UseInMemoryDatabase($"alerta360-assets-{Guid.NewGuid()}")
            .Options;
        _db = new Alerta360DbContext(options);
        _ctrl = new AssetsController(_db);

        var client = new Client { Name = "Cliente test" };
        _db.Clients.Add(client);
        _db.SaveChanges();

        var asset = new Asset
        {
            Id = _assetId, ClientId = client.Id, ExternalId = "TAL-01",
            Name = "Inclinómetro 01", AssetType = "talud_inclinometro",
            ExpectedIntervalSeconds = 300, IsCritical = true, Status = AssetStatus.Critical
        };
        var other = new Asset
        {
            Id = _otherAssetId, ClientId = client.Id, ExternalId = "TAL-02",
            Name = "Inclinómetro 02", AssetType = "talud_inclinometro"
        };
        _db.Assets.AddRange(asset, other);

        // 3 snapshots (desc: tercero = más reciente)
        for (var i = 0; i < 3; i++)
            _db.HealthScores.Add(new HealthScoreSnapshot
            {
                AssetId = _assetId, CalculatedAt = DateTime.UtcNow.AddMinutes(-10 * (2 - i)),
                ScoreTotal = 40 + i * 10, Status = i == 2 ? AssetStatus.Critical : AssetStatus.DegradedMinor
            });
        _db.HealthScores.Add(new HealthScoreSnapshot { AssetId = _otherAssetId, ScoreTotal = 90, Status = AssetStatus.Healthy });

        _db.Incidents.AddRange(
            new IncidentEvent { AssetId = _assetId, EventType = IncidentEventType.Critical, DetectedAt = DateTime.UtcNow.AddMinutes(-5), Notes = "n1" },
            new IncidentEvent { AssetId = _assetId, EventType = IncidentEventType.Recovered, DetectedAt = DateTime.UtcNow.AddMinutes(-60), Notes = "n2" },
            new IncidentEvent { AssetId = _otherAssetId, EventType = IncidentEventType.Degraded, DetectedAt = DateTime.UtcNow, Notes = "otro" });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // Serializa como lo hace ASP.NET (camelCase) para poder hacer asserts del JSON.
    private static System.Text.Json.JsonDocument Doc(object? value) =>
        System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(
            value, new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase }));

    [Fact]
    public async Task Get_Devuelve404_SiNoExiste()
    {
        var result = await _ctrl.Get(Guid.NewGuid());
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Get_DevuelveDetalleConLastScoreYConteos()
    {
        var ok = Assert.IsType<OkObjectResult>(await _ctrl.Get(_assetId));
        using var doc = Doc(ok.Value);
        var root = doc.RootElement;
        Assert.Equal("Inclinómetro 01", root.GetProperty("name").GetString());
        Assert.Equal("Critical", root.GetProperty("status").GetString());
        Assert.Equal(60, root.GetProperty("lastScore").GetProperty("scoreTotal").GetInt32());
        Assert.Equal(2, root.GetProperty("incidentCount").GetInt32());
        Assert.True(root.GetProperty("isCritical").GetBoolean());
    }

    [Fact]
    public async Task Scores_DevuelveHistorialDesc_YLimitado()
    {
        var ok = Assert.IsType<OkObjectResult>(await _ctrl.Scores(_assetId, limit: 2));
        using var doc = Doc(ok.Value);
        var arr = doc.RootElement.EnumerateArray().ToList();

        Assert.Equal(2, arr.Count); // limitado
        Assert.Equal(60, arr[0].GetProperty("scoreTotal").GetInt32()); // más reciente primero
        Assert.Equal(50, arr[1].GetProperty("scoreTotal").GetInt32());
    }

    [Fact]
    public async Task Scores_Devuelve404_SiNoExiste()
    {
        Assert.IsType<NotFoundObjectResult>(await _ctrl.Scores(Guid.NewGuid()));
    }

    [Fact]
    public async Task IncidentsPorActivo_SoloLosDeEseActivo()
    {
        var ok = Assert.IsType<OkObjectResult>(await _ctrl.Incidents(_assetId));
        using var doc = Doc(ok.Value);

        Assert.Equal(2, doc.RootElement.GetArrayLength());
        Assert.Equal("n1", doc.RootElement[0].GetProperty("notes").GetString());
    }

    [Fact]
    public async Task IncidentsFeed_DevuelveLosMasRecientes()
    {
        var ctrl = new IncidentsController(_db);
        var ok = Assert.IsType<OkObjectResult>(await ctrl.List(limit: 2));
        using var doc = Doc(ok.Value);

        Assert.Equal(2, doc.RootElement.GetArrayLength());
        Assert.Equal("otro", doc.RootElement[0].GetProperty("notes").GetString()); // -min
    }

    [Fact]
    public async Task List_SigueDevolviendoTodosConLastScore()
    {
        var ok = Assert.IsType<OkObjectResult>(await _ctrl.List());
        using var doc = Doc(ok.Value);

        Assert.Equal(2, doc.RootElement.GetArrayLength());
        var withScore = doc.RootElement.EnumerateArray().First(e => e.GetProperty("id").GetString() == _assetId.ToString());
        Assert.Equal(60, withScore.GetProperty("lastScore").GetProperty("scoreTotal").GetInt32());
    }
}
