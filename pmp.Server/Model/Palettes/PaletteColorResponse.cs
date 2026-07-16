namespace pmp.Server.Model.Palettes;

public class PaletteColorResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Hex { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
