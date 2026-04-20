using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using NeuroMentor.Api.Data;
using NeuroMentor.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Parse Railway's DATABASE_URL (postgres://user:pass@host:port/db) into Npgsql format
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    var npgsqlConn = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
    builder.Configuration["ConnectionStrings:Default"] = npgsqlConn;
}

// ── Database ──────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
       .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

// ── Auth (JWT) ────────────────────────────────────────────────────────────
builder.Services.AddSingleton<JwtService>();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!);
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key),
        };
    });
builder.Services.AddAuthorization();

// ── Services ──────────────────────────────────────────────────────────────
builder.Services.AddHttpClient<ClaudeService>();
builder.Services.AddSingleton<TextExtractionService>();

// ── Controllers + CORS ───────────────────────────────────────────────────
builder.Services.AddControllers();

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins)
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));

// ── App pipeline ──────────────────────────────────────────────────────────
var app = builder.Build();

// Auto-migrate + seed admin on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    const string adminEmail = "icaro.costa@gmail.com";
    if (!db.Users.Any(u => u.Email == adminEmail))
    {
        db.Users.Add(new NeuroMentor.Api.Models.User
        {
            Name = "Ícaro Costa",
            Email = adminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("13052891idI"),
            Role = NeuroMentor.Api.Models.UserRole.Teacher,
            IsAiEnabled = true,
            IsAdmin = true,
        });
        db.SaveChanges();
    }
    else
    {
        var admin = db.Users.First(u => u.Email == adminEmail);
        if (!admin.IsAdmin || !admin.IsAiEnabled)
        {
            admin.IsAdmin = true;
            admin.IsAiEnabled = true;
            db.SaveChanges();
        }
    }
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check
app.MapGet("/health", () => new { status = "ok", version = "1.0.0" });

app.Run();
