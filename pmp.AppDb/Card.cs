namespace pmp.AppDb;

public class Card
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Prompt { get; set; } = string.Empty;

    public int PaletteId { get; set; }

    public Palette Palette { get; set; } = null!;

    public int SkipNumber { get; set; }

    public int HintNumber { get; set; }

    public string ActionType { get; set; } = CardActionTypes.Normal;

    public int DeckOrder { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;

    public DateTimeOffset CreatedUtc { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }

    public DateTimeOffset? ArchivedUtc { get; set; }
}
