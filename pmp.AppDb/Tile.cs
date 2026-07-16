namespace pmp.AppDb;

public class Tile
{
    public int Id { get; set; }

    public int X { get; set; }

    public int Y { get; set; }

    public string Status { get; set; } = TileStatuses.Open;

    public string? CurrentImagePath { get; set; }

    public int? CurrentRevisionId { get; set; }

    public string CreatedByUserId { get; set; } = string.Empty;

    public DateTimeOffset CreatedUtc { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }

    public DateTimeOffset? ArchivedUtc { get; set; }

    public string? LockedByUserId { get; set; }

    public DateTimeOffset? LockExpiresUtc { get; set; }

    public int? ActiveEditSessionId { get; set; }
}
