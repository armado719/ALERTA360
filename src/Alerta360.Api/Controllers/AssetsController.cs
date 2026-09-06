using Alerta360.Api.Data;
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
        return Ok(assets.Select(a => new
        {
            a.Id, a.ExternalId, a.Name, a.AssetType, a.ExpectedIntervalSeconds,
            a.LocationLabel, a.IsCritical, status = a.Status.ToString(),
            lastScore = byAsset.TryGetValue(a.Id, out var s) ? new
            {
                s.ScoreTotal, s.ScoreDisponibilidad, s.ScoreFrescura, s.ScoreCalidad,
                s.ScoreConsistencia, s.ScoreComunicacion, status = s.Status.ToString(), s.CalculatedAt
            } : null
        }));
    }
}
