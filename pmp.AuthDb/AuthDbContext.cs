using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace pmp.AuthDb;

public class AuthDbContext(DbContextOptions<AuthDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(refreshToken => refreshToken.Id);

            entity.Property(refreshToken => refreshToken.TokenHash)
                .IsRequired()
                .HasMaxLength(128);

            entity.Property(refreshToken => refreshToken.ReplacedByTokenHash)
                .HasMaxLength(128);

            entity.Property(refreshToken => refreshToken.CreatedByIp)
                .HasMaxLength(64);

            entity.Property(refreshToken => refreshToken.RevokedByIp)
                .HasMaxLength(64);

            entity.HasIndex(refreshToken => refreshToken.TokenHash)
                .IsUnique();

            entity.HasIndex(refreshToken => new { refreshToken.UserId, refreshToken.ExpiresUtc });

            entity.HasOne(refreshToken => refreshToken.User)
                .WithMany(user => user.RefreshTokens)
                .HasForeignKey(refreshToken => refreshToken.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
