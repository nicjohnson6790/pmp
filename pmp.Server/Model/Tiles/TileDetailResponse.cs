using pmp.AppDb;

namespace pmp.Server.Model.Tiles;

public class TileDetailResponse : TileSummaryResponse
{
    public int? CurrentRevisionId { get; set; }

    public int? ActiveEditSessionId { get; set; }

    public DateTimeOffset CreatedUtc { get; set; }

    public static TileDetailResponse FromTile(Tile tile)
    {
        return new TileDetailResponse
        {
            Id = tile.Id,
            X = tile.X,
            Y = tile.Y,
            Status = tile.Status,
            CurrentImagePath = tile.CurrentImagePath,
            CurrentRevisionId = tile.CurrentRevisionId,
            IsLocked = tile.LockExpiresUtc != null && tile.LockExpiresUtc > DateTimeOffset.UtcNow,
            LockExpiresUtc = tile.LockExpiresUtc,
            ActiveEditSessionId = tile.ActiveEditSessionId,
            CreatedUtc = tile.CreatedUtc,
            UpdatedUtc = tile.UpdatedUtc
        };
    }
}
