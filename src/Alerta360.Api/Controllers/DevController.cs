using System.Text.Json;
using Alerta360.Api.Data;
using Alerta360.Api.Models;
using Alerta360.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Alerta360.Api.Controllers;

// Solo desarrollo: seed + telemetría simulada + disparo manual (Fase 0 pendiente, sin cliente real).
[ApiController, Route("api/dev")]
public class DevController(Alerta360DbContext db, HealthEvaluationService eval) : ControllerBase
{
    [HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        if (await db.Clients.AnyAsync()) return Ok(new { seeded = false, reason = "ya existe cliente" });
        var client = new Client { Name = "Minera Ejemplo S.A. (ficticia)", Vertical = Vertical.Mineria };
        db.Clients.Add(client);
        var rnd = new Random(42);
        for (int i = 1; i <= 20; i++)
        {
            var critical = i <= 5; // 5 de 20 en zona crítica (escenario de trabajo)
            var asset = new Asset
            {
                Client = client, ExternalId = $"TAL-{i:00}",
                Name = $"Inclinómetro Talud {(critical ? "CRIT-" : "")}{i:00}",
                AssetType = "talud_inclinometro", ExpectedIntervalSeconds = 300,
                LocationLabel = critical ? "zona talud activo" : "zona perimetral",
                IsCritical = critical
            };
            db.Assets.Add(asset);
            // Telemetría simulada últimos 30 min (cada 5 min = 6 lecturas):
            // - 1-15 sanos con leve variación
            // - 16-17 sin datos recientes (stale → disponibilidad/frescura rojo)
            // - 18 congelado (mismo valor 6x → consistencia rojo = falso saludable)
            // - 19-20 fuera de rango (calidad rojo)
            var now = DateTime.UtcNow;
            for (int k = 5; k >= 0; k--) // última lectura = ahora (sanos quedan en 100)
            {
                var t = now - TimeSpan.FromMinutes(5 * k);
                decimal? v = i switch
                {
                    <= 15 => 5 + (decimal)(rnd.NextDouble() * 4 - 2), // sano ~3..7mm
                    16 or 17 when k >= 1 => null,                      // se llena abajo (solo viejas)
                    18 => 12.4m,                                       // congelado
                    19 => 250m,                                        // fuera de rango
                    20 => -150m,                                       // fuera de rango
                    _ => 5m
                };
                if (i is 16 or 17)
                {
                    if (k >= 4) // solo 2 lecturas viejas (>20 min) → stale
                        db.TelemetryReadings.Add(new TelemetryReading
                        {
                            Asset = asset, ReceivedAt = t, MeasuredAt = t,
                            ParsedValue = 6.1m, IsValid = true,
                            RawValue = JsonDocument.Parse($"{{\"value\":6.1,\"unit\":\"mm\"}}")
                        });
                    continue;
                }
                db.TelemetryReadings.Add(new TelemetryReading
                {
                    Asset = asset, ReceivedAt = t, MeasuredAt = t,
                    ParsedValue = v, IsValid = v is not null && v >= -100 && v <= 100,
                    RawValue = JsonDocument.Parse($"{{\"value\":{(v?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "null")},\"unit\":\"mm\"}}")
                });
            }
        }
        await db.SaveChangesAsync();
        return Ok(new { seeded = true, assets = 20, critical = 5 });
    }

    [HttpPost("evaluate")]
    public async Task<IActionResult> Evaluate()
    {
        await eval.EvaluateAllAsync();
        var caps = await db.CapabilitySnapshots.OrderByDescending(c => c.CalculatedAt).Take(3).ToListAsync();
        var incidents = await db.Incidents.OrderByDescending(i => i.DetectedAt).Take(10).ToListAsync();
        return Ok(new { capability = caps.FirstOrDefault()?.Score, incidents = incidents.Select(i => new { i.AssetId, type = i.EventType.ToString(), i.DetectedAt, i.Notes }) });
    }

    [HttpGet("incidents")]
    public async Task<IActionResult> Incidents()
        => Ok(await db.Incidents.OrderByDescending(i => i.DetectedAt).Take(50).ToListAsync());
}
