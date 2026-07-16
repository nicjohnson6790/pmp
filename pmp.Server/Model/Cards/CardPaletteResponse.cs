using pmp.Server.Model.Palettes;

namespace pmp.Server.Model.Cards;

public class CardPaletteResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<PaletteColorResponse> Colors { get; set; } = [];
}
