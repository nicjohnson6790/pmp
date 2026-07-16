using System.ComponentModel.DataAnnotations;
using pmp.AppDb;

namespace pmp.Server.Model.Cards;

public class CardSaveRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Prompt { get; set; } = string.Empty;

    public int PaletteId { get; set; }

    [Range(1, 9)]
    public int SkipNumber { get; set; } = 1;

    [Range(1, 9)]
    public int HintNumber { get; set; } = 1;

    [Required]
    public string ActionType { get; set; } = CardActionTypes.Normal;

    public int DeckOrder { get; set; }
}
