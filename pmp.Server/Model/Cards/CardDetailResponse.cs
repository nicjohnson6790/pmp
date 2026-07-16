namespace pmp.Server.Model.Cards;

public class CardDetailResponse : CardSummaryResponse
{
    public DateTimeOffset CreatedUtc { get; set; }
}
