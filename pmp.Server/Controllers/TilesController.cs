using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using pmp.AppDb;
using pmp.Server.Model.Tiles;

namespace pmp.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TilesController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TileSummaryResponse>>> GetTiles(
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var tiles = await dbContext.Tiles
            .AsNoTracking()
            .Where(tile => tile.ArchivedUtc == null)
            .OrderBy(tile => tile.Y)
            .ThenBy(tile => tile.X)
            .Select(tile => new TileSummaryResponse
            {
                Id = tile.Id,
                X = tile.X,
                Y = tile.Y,
                Status = tile.Status,
                CurrentImagePath = tile.CurrentImagePath,
                IsLocked = tile.LockExpiresUtc != null && tile.LockExpiresUtc > now,
                LockExpiresUtc = tile.LockExpiresUtc,
                UpdatedUtc = tile.UpdatedUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(tiles);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TileDetailResponse>> GetTile(
        int id,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var tile = await dbContext.Tiles
            .AsNoTracking()
            .Where(tile => tile.Id == id && tile.ArchivedUtc == null)
            .Select(tile => new TileDetailResponse
            {
                Id = tile.Id,
                X = tile.X,
                Y = tile.Y,
                Status = tile.Status,
                CurrentImagePath = tile.CurrentImagePath,
                CurrentRevisionId = tile.CurrentRevisionId,
                IsLocked = tile.LockExpiresUtc != null && tile.LockExpiresUtc > now,
                LockExpiresUtc = tile.LockExpiresUtc,
                ActiveEditSessionId = tile.ActiveEditSessionId,
                CreatedUtc = tile.CreatedUtc,
                UpdatedUtc = tile.UpdatedUtc
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (tile is null)
        {
            return NotFound();
        }

        return Ok(tile);
    }

    [HttpPost]
    [ProducesResponseType<TileDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TileDetailResponse>> CreateTile(
        TileCreateRequest request,
        CancellationToken cancellationToken)
    {
        var validationResult = await ValidateTileCreate(request, cancellationToken);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var now = DateTimeOffset.UtcNow;
        var tile = new Tile
        {
            X = request.X,
            Y = request.Y,
            Status = TileStatuses.Open,
            CurrentImagePath = NormalizeOptionalText(request.CurrentImagePath),
            CreatedByUserId = GetUserId(),
            CreatedUtc = now,
            UpdatedUtc = now
        };

        dbContext.Tiles.Add(tile);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = TileDetailResponse.FromTile(tile);
        return CreatedAtAction(nameof(GetTile), new { id = tile.Id }, response);
    }

    [HttpPost("{id:int}/archive")]
    public async Task<IActionResult> ArchiveTile(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var tile = await dbContext.Tiles
            .SingleOrDefaultAsync(
                tile => tile.Id == id && tile.CreatedByUserId == userId && tile.ArchivedUtc == null,
                cancellationToken);

        if (tile is null)
        {
            return NotFound();
        }

        tile.ArchivedUtc = DateTimeOffset.UtcNow;
        tile.UpdatedUtc = tile.ArchivedUtc.Value;
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<ActionResult?> ValidateTileCreate(
        TileCreateRequest request,
        CancellationToken cancellationToken)
    {
        var coordinateExists = await dbContext.Tiles
            .AnyAsync(
                tile => tile.X == request.X && tile.Y == request.Y && tile.ArchivedUtc == null,
                cancellationToken);

        if (coordinateExists)
        {
            ModelState.AddModelError(nameof(request.X), "A tile already exists at those coordinates.");
            ModelState.AddModelError(nameof(request.Y), "A tile already exists at those coordinates.");
        }

        return ModelState.IsValid ? null : ValidationProblem(ModelState);
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Authenticated user is missing a name identifier claim.");
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
