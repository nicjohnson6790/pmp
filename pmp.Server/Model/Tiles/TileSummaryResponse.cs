namespace pmp.Server.Model.Tiles;

public class TileSummaryResponse
{
    public int Id { get; set; }

    public int X { get; set; }

    public int Y { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? CurrentImagePath { get; set; }

    public bool IsLocked { get; set; }

    public DateTimeOffset? LockExpiresUtc { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }
}
