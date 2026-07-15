namespace pmp.AppDb;

public class Palette
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;

    public DateTimeOffset CreatedUtc { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }

    public DateTimeOffset? ArchivedUtc { get; set; }

    public List<PaletteColor> Colors { get; set; } = [];
}
