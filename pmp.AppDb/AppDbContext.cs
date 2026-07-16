using Microsoft.EntityFrameworkCore;

namespace pmp.AppDb;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Card> Cards => Set<Card>();

    public DbSet<Palette> Palettes => Set<Palette>();

    public DbSet<PaletteColor> PaletteColors => Set<PaletteColor>();

    public DbSet<Tile> Tiles => Set<Tile>();

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

        builder.Entity<Card>(entity =>
        {
            entity.HasKey(card => card.Id);

            entity.Property(card => card.Title)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(card => card.Prompt)
                .IsRequired()
                .HasMaxLength(2000);

            entity.Property(card => card.ActionType)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(card => card.CreatedByUserId)
                .IsRequired()
                .HasMaxLength(450);

            entity.HasIndex(card => new { card.CreatedByUserId, card.ArchivedUtc });

            entity.HasIndex(card => new { card.CreatedByUserId, card.DeckOrder });

            entity.HasOne(card => card.Palette)
                .WithMany(palette => palette.Cards)
                .HasForeignKey(card => card.PaletteId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Tile>(entity =>
        {
            entity.HasKey(tile => tile.Id);

            entity.Property(tile => tile.Status)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(tile => tile.CurrentImagePath)
                .HasMaxLength(1000);

            entity.Property(tile => tile.CreatedByUserId)
                .IsRequired()
                .HasMaxLength(450);

            entity.Property(tile => tile.LockedByUserId)
                .HasMaxLength(450);

            entity.HasIndex(tile => new { tile.X, tile.Y })
                .IsUnique()
                .HasFilter("[ArchivedUtc] IS NULL");

            entity.HasIndex(tile => new { tile.CreatedByUserId, tile.ArchivedUtc });

            entity.HasIndex(tile => new { tile.Status, tile.LockExpiresUtc });
        });
    }
}
