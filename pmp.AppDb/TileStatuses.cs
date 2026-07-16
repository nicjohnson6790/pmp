namespace pmp.AppDb;

public static class TileStatuses
{
    public const string Open = "open";
    public const string Locked = "locked";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Open,
        Locked
    };
}
