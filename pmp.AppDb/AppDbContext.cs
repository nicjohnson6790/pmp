using Microsoft.EntityFrameworkCore;

namespace pmp.AppDb;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Palette> Palettes => Set<Palette>();

    public DbSet<PaletteColor> PaletteColors => Set<PaletteColor>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Palette>(entity =>
        {
            entity.HasKey(palette => palette.Id);

            entity.Property(palette => palette.Name)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(palette => palette.Description)
                .HasMaxLength(1000);

            entity.Property(palette => palette.CreatedByUserId)
                .IsRequired()
                .HasMaxLength(450);

            entity.HasIndex(palette => new { palette.CreatedByUserId, palette.ArchivedUtc });

            entity.HasMany(palette => palette.Colors)
                .WithOne(color => color.Palette)
                .HasForeignKey(color => color.PaletteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PaletteColor>(entity =>
        {
            entity.HasKey(color => color.Id);

            entity.Property(color => color.Name)
                .IsRequired()
                .HasMaxLength(80);

            entity.Property(color => color.Hex)
                .IsRequired()
                .HasMaxLength(7);

            entity.HasIndex(color => new { color.PaletteId, color.SortOrder });

            entity.HasIndex(color => new { color.PaletteId, color.Name })
                .IsUnique();
        });
    }
}
