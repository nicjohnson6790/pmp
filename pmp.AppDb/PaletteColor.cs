namespace pmp.AppDb;

public class PaletteColor
{
    public int Id { get; set; }

    public int PaletteId { get; set; }

    public Palette Palette { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public string Hex { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
