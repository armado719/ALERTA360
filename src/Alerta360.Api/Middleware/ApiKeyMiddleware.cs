using System.Security.Cryptography;
using System.Text;

namespace Alerta360.Api.Middleware;

// Auth mínima por API key (header X-API-Key).
// Protege: /api/dev/* (siempre) y cualquier método de escritura (POST/PUT/PATCH/DELETE).
// Público: GET/HEAD/OPTIONS fuera de /api/dev (dashboard) y /health (monitoreo).
// Fail-closed: si no hay key configurada (producción sin Security:ApiKey), responde 503.
public class ApiKeyMiddleware(RequestDelegate next, IConfiguration config)
{
    public const string HeaderName = "X-API-Key";
    private const string ConfigKey = "Security:ApiKey";

    protected virtual string? ConfiguredKey => config[ConfigKey];

    public async Task InvokeAsync(HttpContext ctx)
    {
        if (!IsProtected(ctx.Request))
        {
            await next(ctx);
            return;
        }

        var configured = ConfiguredKey;
        if (string.IsNullOrEmpty(configured))
        {
            ctx.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await ctx.Response.WriteAsJsonAsync(new
            {
                error = "api_key_no_configurada",
                detail = $"Configura {ConfigKey} (env: Security__ApiKey) para usar este endpoint."
            });
            return;
        }

        var given = ctx.Request.Headers[HeaderName].ToString();
        if (!FixedTimeEquals(given, configured))
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await ctx.Response.WriteAsJsonAsync(new { error = "api_key_invalida", detail = $"Envía {HeaderName}." });
            return;
        }

        await next(ctx);
    }

    private static bool IsProtected(HttpRequest req)
    {
        if (req.Path.StartsWithSegments("/api/dev")) return true;
        var m = req.Method;
        if (HttpMethods.IsGet(m) || HttpMethods.IsHead(m) || HttpMethods.IsOptions(m)) return false;
        return !req.Path.StartsWithSegments("/health");
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var ba = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        return ba.Length == bb.Length && CryptographicOperations.FixedTimeEquals(ba, bb);
    }
}
