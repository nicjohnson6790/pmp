namespace pmp.Server.Model.Cards;

public class CardSummaryResponse
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Prompt { get; set; } = string.Empty;

    public int PaletteId { get; set; }

    public CardPaletteResponse Palette { get; set; } = new();

    public int SkipNumber { get; set; }

    public int HintNumber { get; set; }

    public string ActionType { get; set; } = string.Empty;

    public int DeckOrder { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }
}
