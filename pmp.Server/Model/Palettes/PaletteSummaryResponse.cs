namespace pmp.Server.Model.Palettes;

public class PaletteSummaryResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }

    public List<PaletteColorResponse> Colors { get; set; } = [];
}
