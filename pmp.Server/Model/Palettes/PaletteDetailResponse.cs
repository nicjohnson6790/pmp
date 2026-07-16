using pmp.AppDb;

namespace pmp.Server.Model.Palettes;

public class PaletteDetailResponse : PaletteSummaryResponse
{
    public DateTimeOffset CreatedUtc { get; set; }

    public static PaletteDetailResponse FromPalette(Palette palette)
    {
        return new PaletteDetailResponse
        {
            Id = palette.Id,
            Name = palette.Name,
            Description = palette.Description,
            CreatedUtc = palette.CreatedUtc,
            UpdatedUtc = palette.UpdatedUtc,
            Colors = palette.Colors
                .OrderBy(color => color.SortOrder)
                .Select(color => new PaletteColorResponse
                {
                    Id = color.Id,
                    Name = color.Name,
                    Hex = color.Hex,
                    SortOrder = color.SortOrder
                })
                .ToList()
        };
    }
}
