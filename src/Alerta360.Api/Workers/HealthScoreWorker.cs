using Alerta360.Api.Services;

namespace Alerta360.Api.Workers;

// Job periódico (Arquitectura §4): cada N minutos, fuera del camino crítico de ingesta.
public class HealthScoreWorker(IServiceProvider sp, IConfiguration cfg, ILogger<HealthScoreWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var seconds = cfg.GetValue("Health:IntervalSeconds", 300);
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken); // gracia de arranque
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = sp.CreateScope();
                await scope.ServiceProvider.GetRequiredService<HealthEvaluationService>()
                    .EvaluateAllAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "HealthScoreWorker falló una pasada (se reintenta en el siguiente ciclo)");
            }
            await Task.Delay(TimeSpan.FromSeconds(seconds), stoppingToken);
        }
    }
}
