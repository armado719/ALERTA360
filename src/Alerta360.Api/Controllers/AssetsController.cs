using Alerta360.Api.Data;
using Alerta360.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alerta360.Api.Controllers;

[ApiController, Route("api/assets")]
public class AssetsController(Alerta360DbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var assets = await db.Assets.OrderBy(a => a.Name).ToListAsync();
        var ids = assets.Select(a => a.Id).ToList();
        var lastScores = await db.HealthScores
            .Where(h => ids.Contains(h.AssetId))
            .GroupBy(h => h.AssetId)
            .Select(g => g.OrderByDescending(h => h.CalculatedAt).First())
            .ToListAsync();
        var byAsset = lastScores.ToDictionary(h => h.AssetId);
        return Ok(assets.Select(a => Shape(a, byAsset.GetValueOrDefault(a.Id))));
    }

    // Detalle para la pantalla de activo: datos + último score.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == id);
        if (asset is null) return NotFound(new { error = "asset_no_encontrado", id });

        var last = await db.HealthScores
            .Where(h => h.AssetId == id)
            .OrderByDescending(h => h.CalculatedAt)
            .FirstOrDefaultAsync();
        var incidentCount = await db.Incidents.CountAsync(i => i.AssetId == id);
        var readingCount = await db.TelemetryReadings.CountAsync(t => t.AssetId == id);
        return Ok(new
        {
            asset.Id, asset.ExternalId, asset.Name, asset.AssetType, asset.ExpectedIntervalSeconds,
            asset.LocationLabel, asset.IsCritical, status = asset.Status.ToString(),
            asset.UpdatedAt, incidentCount, readingCount,
            lastScore = ScoreShape(last)
        });
    }

    // Histórico de health scores para la gráfica (más reciente primero).
    [HttpGet("{id:guid}/scores")]
    public async Task<IActionResult> Scores(Guid id, [FromQuery] int limit = 120)
    {
        if (!await db.Assets.AnyAsync(a => a.Id == id))
            return NotFound(new { error = "asset_no_encontrado", id });

        limit = Math.Clamp(limit, 1, 500);
        var scores = await db.HealthScores
            .Where(h => h.AssetId == id)
            .OrderByDescending(h => h.CalculatedAt)
            .Take(limit)
            .Select(h => new
            {
                h.CalculatedAt, h.ScoreTotal, h.ScoreDisponibilidad, h.ScoreFrescura,
                h.ScoreCalidad, h.ScoreConsistencia, h.ScoreComunicacion,
                status = h.Status.ToString()
            })
            .ToListAsync();
        return Ok(scores);
    }

    // Incidentes de un activo (pantalla detalle).
    [HttpGet("{id:guid}/incidents")]
    public async Task<IActionResult> Incidents(Guid id, [FromQuery] int limit = 50)
    {
        if (!await db.Assets.AnyAsync(a => a.Id == id))
            return NotFound(new { error = "asset_no_encontrado", id });

        limit = Math.Clamp(limit, 1, 200);
        var items = await db.Incidents
            .Where(i => i.AssetId == id)
            .OrderByDescending(i => i.DetectedAt)
            .Take(limit)
            .Select(i => new { i.EventType, i.DetectedAt, i.Notes })
            .ToListAsync();
        return Ok(items);
    }

    private static object Shape(Asset a, HealthScoreSnapshot? s) => new
    {
        a.Id, a.ExternalId, a.Name, a.AssetType, a.ExpectedIntervalSeconds,
        a.LocationLabel, a.IsCritical, status = a.Status.ToString(),
        lastScore = ScoreShape(s)
    };

    private static object? ScoreShape(HealthScoreSnapshot? s) => s is null ? null : new
    {
        s.ScoreTotal, s.ScoreDisponibilidad, s.ScoreFrescura, s.ScoreCalidad,
        s.ScoreConsistencia, s.ScoreComunicacion, status = s.Status.ToString(), s.CalculatedAt
    };
}
