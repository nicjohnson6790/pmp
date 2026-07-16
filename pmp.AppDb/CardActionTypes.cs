namespace pmp.AppDb;

public static class CardActionTypes
{
    public const string Normal = "normal";
    public const string ShuffleDeck = "shuffleDeck";
    public const string CreateTile = "createTile";
    public const string CreateCard = "createCard";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Normal,
        ShuffleDeck,
        CreateTile,
        CreateCard
    };
}
