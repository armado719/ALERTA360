using Alerta360.Api.Data;
using Alerta360.Api.Services;
using Alerta360.Api.Workers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddDbContext<Alerta360DbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddSingleton<INotificationService, NotificationService>();
builder.Services.AddScoped<HealthEvaluationService>();
builder.Services.AddHostedService<HealthScoreWorker>();

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors();

// Auth mínima por API key: /api/dev/* y cualquier escritura (401 sin key, 503 si no está configurada).
app.UseMiddleware<Alerta360.Api.Middleware.ApiKeyMiddleware>();

app.MapControllers();

// NOTA Fase 1 esqueleto: sin endpoint de ingesta real (bloqueado hasta Fase 0).
// Health-check que verifica API + conectividad con la base de datos.
app.MapGet("/health", async (Alerta360DbContext db, CancellationToken ct) =>
{
    var dbOk = await db.Database.CanConnectAsync(ct);
    return dbOk
        ? Results.Ok(new { status = "ok", service = "alerta360-api", db = "ok" })
        : Results.Json(new { status = "degraded", service = "alerta360-api", db = "error" }, statusCode: 503);
})
.WithName("Health");

app.Run();
