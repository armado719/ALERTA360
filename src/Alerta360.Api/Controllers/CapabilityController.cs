using Alerta360.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alerta360.Api.Controllers;

[ApiController, Route("api/capability")]
public class CapabilityController(Alerta360DbContext db) : ControllerBase
{
    [HttpGet("latest")]
    public async Task<IActionResult> Latest([FromQuery] Guid? clientId)
    {
        var q = db.CapabilitySnapshots.AsQueryable();
        if (clientId.HasValue) q = q.Where(c => c.ClientId == clientId.Value);
        var s = await q.OrderByDescending(c => c.CalculatedAt).FirstOrDefaultAsync();
        return s is null ? NotFound() : Ok(s);
    }

    [HttpGet("clients")]
    public async Task<IActionResult> Clients()
        => Ok(await db.Clients.Select(c => new { c.Id, c.Name }).ToListAsync());
}
