using Alerta360.Api.Data;
using Alerta360.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Alerta360.Api.Services;

// Motor de Health Score + Capability (Arquitectura §4-5, valores de trabajo del escenario Minería).
public class HealthEvaluationService(Alerta360DbContext db, INotificationService notify, ILogger<HealthEvaluationService> log)
{
    public async Task EvaluateAllAsync(CancellationToken ct = default)
    {
        var assets = await db.Assets.Include(a => a.Client).ToListAsync(ct);
        foreach (var a in assets)
            await EvaluateAssetAsync(a, ct);
        await db.SaveChangesAsync(ct); // los snapshots deben estar persistidos antes de agregar capability
        foreach (var clientId in assets.Select(a => a.ClientId).Distinct())
            await EvaluateCapabilityAsync(clientId, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task EvaluateAssetAsync(Asset asset, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var interval = TimeSpan.FromSeconds(asset.ExpectedIntervalSeconds <= 0 ? 300 : asset.ExpectedIntervalSeconds);
        var readings = await db.TelemetryReadings
            .Where(t => t.AssetId == asset.Id)
            .OrderByDescending(t => t.ReceivedAt)
            .Take(12)
            .ToListAsync(ct);

        var last = readings.FirstOrDefault();
        var lastValid = readings.FirstOrDefault(r => r.IsValid);

        // Disponibilidad: ¿dato en 1x / 2x intervalo?
        int disp = last is null ? 0
            : (now - last.ReceivedAt) <= interval ? 100
            : (now - last.ReceivedAt) <= interval * 2 ? 50 : 0;

        // Frescura (min desde última válida): 0-5 verde, 5-10 amarillo, >10 rojo.
        int fres = lastValid is null ? 0
            : (now - lastValid.ReceivedAt).TotalMinutes <= 5 ? 100
            : (now - lastValid.ReceivedAt).TotalMinutes <= 10 ? 60 : 0;

        // Calidad: rango físico por tipo.
        int cal = 100;
        string calReason = "en rango";
        if (last?.ParsedValue is decimal v)
        {
            var (min, max) = RangeFor(asset.AssetType);
            if (v < min || v > max) { cal = 0; calReason = $"fuera de rango [{min},{max}] valor={v}"; }
        }
        else if (last is not null && !last.IsValid) { cal = 0; calReason = "marcada inválida"; }
        else if (last is null) { cal = 0; calReason = "sin datos"; }

        // Consistencia: mismo valor en últimas 3 lecturas (≥15 min con intervalo 5min) → congelado.
        int cons = 100;
        var vals = readings.Take(3).Select(r => r.ParsedValue).ToList();
        if (vals.Count >= 3 && vals.All(x => x.HasValue) && vals.Distinct().Count() == 1)
            cons = 0;
        var consReason = cons == 0 ? "dato congelado (3+ iguales)" : "varía normal";

        // Comunicación: % lecturas esperadas recibidas en últimos 30 min.
        var windowStart = now - TimeSpan.FromMinutes(30);
        var expected = Math.Max(1, (int)(TimeSpan.FromMinutes(30).TotalSeconds / interval.TotalSeconds));
        var received = readings.Count(r => r.ReceivedAt >= windowStart);
        int com = Math.Min(100, received * 100 / expected);

        var total = (int)Math.Round(0.30 * cons + 0.25 * cal + 0.20 * disp + 0.15 * fres + 0.10 * com);

        // Veto (Master §9): consistencia o calidad en rojo → nunca saludable.
        AssetStatus status;
        string reason;
        if (cons == 0 || cal == 0)
        {
            status = cons == 0 && cal == 0 ? AssetStatus.DegradedMajor : AssetStatus.DegradedMinor;
            reason = cons == 0 ? consReason : calReason;
            if (disp == 0 && fres == 0) status = AssetStatus.Critical;
            // Se expone como "datos no confiables" vía evento DataUnreliable + banda degradada.
        }
        else
        {
            status = total == 100 ? AssetStatus.Healthy
                : total >= 80 ? AssetStatus.DegradedMinor
                : total >= 60 ? AssetStatus.DegradedMajor : AssetStatus.Critical;
            reason = $"score={total}";
        }

        var prev = await db.HealthScores
            .Where(h => h.AssetId == asset.Id)
            .OrderByDescending(h => h.CalculatedAt)
            .FirstOrDefaultAsync(ct);

        db.HealthScores.Add(new HealthScoreSnapshot
        {
            AssetId = asset.Id, CalculatedAt = now,
            ScoreDisponibilidad = disp, ScoreFrescura = fres, ScoreCalidad = cal,
            ScoreConsistencia = cons, ScoreComunicacion = com,
            ScoreTotal = total, Status = status
        });

        if ((prev is null && status != AssetStatus.Healthy) || (prev is not null && prev.Status != status))
        {
            var evt = (cons == 0 || cal == 0) && status != AssetStatus.Critical
                ? IncidentEventType.DataUnreliable
                : status == AssetStatus.Healthy ? IncidentEventType.Recovered
                : status == AssetStatus.Critical ? IncidentEventType.Critical
                : IncidentEventType.Degraded;
            db.Incidents.Add(new IncidentEvent
            {
                AssetId = asset.Id, EventType = evt, DetectedAt = now,
                Notes = $"Health {prev?.Status}->{status}. {reason} (D{disp}/F{fres}/C{cal}/Co{cons}/Cm{com})"
            });
            notify.TryNotify(asset.Id, asset.Name, prev?.Status.ToString() ?? "none", status.ToString(), reason);
            log.LogInformation("Asset {Name}: {Prev}->{Status} total={Total} {Reason}", asset.Name, prev?.Status, status, total, reason);
        }

        asset.Status = status;
        asset.UpdatedAt = now;
    }

    public async Task<int> EvaluateCapabilityAsync(Guid clientId, CancellationToken ct = default)
    {
        var assets = await db.Assets.Where(a => a.ClientId == clientId).ToListAsync(ct);
        if (assets.Count == 0) return 0;
        var latest = new Dictionary<Guid, int>();
        foreach (var a in assets)
        {
            var s = await db.HealthScores.Where(h => h.AssetId == a.Id)
                .OrderByDescending(h => h.CalculatedAt).FirstOrDefaultAsync(ct);
            latest[a.Id] = s?.ScoreTotal ?? 0;
        }
        double num = 0, den = 0;
        int crit = 0;
        foreach (var a in assets)
        {
            var w = a.IsCritical ? 2 : 1;
            if (a.IsCritical) crit++;
            num += latest[a.Id] * w; den += w;
        }
        var score = den == 0 ? 0 : (int)Math.Round(num / den);
        db.CapabilitySnapshots.Add(new AlertingCapabilitySnapshot
        {
            ClientId = clientId, CalculatedAt = DateTime.UtcNow,
            Score = score, AssetCount = assets.Count,
            CriticalAssetCount = assets.Count(a => a.Status == AssetStatus.Critical)
        });
        return score;
    }

    public static (decimal min, decimal max) RangeFor(string assetType) => assetType switch
    {
        "talud_piezometro" => (0, 500),
        _ => (-100, 100), // talud_inclinometro / talud_desplazamiento / otro
    };
}
