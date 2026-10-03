using Alerta360.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alerta360.Api.Controllers;

// Feed público de incidentes para el dashboard (lectura, GET abierto como el resto de vistas).
[ApiController, Route("api/incidents")]
public class IncidentsController(Alerta360DbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int limit = 50)
    {
        limit = Math.Clamp(limit, 1, 200);
        var items = await db.Incidents
            .OrderByDescending(i => i.DetectedAt)
            .Take(limit)
            .Select(i => new { i.AssetId, i.EventType, i.DetectedAt, i.Notes })
            .ToListAsync();
        return Ok(items);
    }
}
