using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using pmp.AppDb;

namespace pmp.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CardsController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CardSummaryResponse>>> GetCards(
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var cards = await dbContext.Cards
            .AsNoTracking()
            .Where(card => card.CreatedByUserId == userId && card.ArchivedUtc == null)
            .OrderBy(card => card.DeckOrder)
            .ThenBy(card => card.Title)
            .Select(card => new CardSummaryResponse
            {
                Id = card.Id,
                Title = card.Title,
                Prompt = card.Prompt,
                PaletteId = card.PaletteId,
                Palette = new CardPaletteResponse
                {
                    Id = card.Palette.Id,
                    Name = card.Palette.Name,
                    Colors = card.Palette.Colors
                        .OrderBy(color => color.SortOrder)
                        .Select(color => new PaletteColorResponse
                        {
                            Id = color.Id,
                            Name = color.Name,
                            Hex = color.Hex,
                            SortOrder = color.SortOrder
                        })
                        .ToList()
                },
                SkipNumber = card.SkipNumber,
                HintNumber = card.HintNumber,
                ActionType = card.ActionType,
                DeckOrder = card.DeckOrder,
                UpdatedUtc = card.UpdatedUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(cards);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CardDetailResponse>> GetCard(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var card = await dbContext.Cards
            .AsNoTracking()
            .Where(card => card.Id == id && card.CreatedByUserId == userId && card.ArchivedUtc == null)
            .Select(card => new CardDetailResponse
            {
                Id = card.Id,
                Title = card.Title,
                Prompt = card.Prompt,
                PaletteId = card.PaletteId,
                Palette = new CardPaletteResponse
                {
                    Id = card.Palette.Id,
                    Name = card.Palette.Name,
                    Colors = card.Palette.Colors
                        .OrderBy(color => color.SortOrder)
                        .Select(color => new PaletteColorResponse
                        {
                            Id = color.Id,
                            Name = color.Name,
                            Hex = color.Hex,
                            SortOrder = color.SortOrder
                        })
                        .ToList()
                },
                SkipNumber = card.SkipNumber,
                HintNumber = card.HintNumber,
                ActionType = card.ActionType,
                DeckOrder = card.DeckOrder,
                CreatedUtc = card.CreatedUtc,
                UpdatedUtc = card.UpdatedUtc
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (card is null)
        {
            return NotFound();
        }

        return Ok(card);
    }

    [HttpPost]
    [ProducesResponseType<CardDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CardDetailResponse>> CreateCard(
        CardSaveRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var validationResult = await ValidateCard(request, userId, cancellationToken);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var now = DateTimeOffset.UtcNow;
        var card = new Card
        {
            Title = request.Title.Trim(),
            Prompt = request.Prompt.Trim(),
            PaletteId = request.PaletteId,
            SkipNumber = request.SkipNumber,
            HintNumber = request.HintNumber,
            ActionType = request.ActionType.Trim(),
            DeckOrder = request.DeckOrder,
            CreatedByUserId = userId,
            CreatedUtc = now,
            UpdatedUtc = now
        };

        dbContext.Cards.Add(card);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await GetCardResponse(card.Id, userId, cancellationToken);
        return CreatedAtAction(nameof(GetCard), new { id = card.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CardDetailResponse>> UpdateCard(
        int id,
        CardSaveRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var validationResult = await ValidateCard(request, userId, cancellationToken);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var card = await dbContext.Cards
            .SingleOrDefaultAsync(
                card => card.Id == id && card.CreatedByUserId == userId && card.ArchivedUtc == null,
                cancellationToken);

        if (card is null)
        {
            return NotFound();
        }

        card.Title = request.Title.Trim();
        card.Prompt = request.Prompt.Trim();
        card.PaletteId = request.PaletteId;
        card.SkipNumber = request.SkipNumber;
        card.HintNumber = request.HintNumber;
        card.ActionType = request.ActionType.Trim();
        card.DeckOrder = request.DeckOrder;
        card.UpdatedUtc = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await GetCardResponse(card.Id, userId, cancellationToken);
        return Ok(response);
    }

    [HttpPost("{id:int}/archive")]
    public async Task<IActionResult> ArchiveCard(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var card = await dbContext.Cards
            .SingleOrDefaultAsync(
                card => card.Id == id && card.CreatedByUserId == userId && card.ArchivedUtc == null,
                cancellationToken);

        if (card is null)
        {
            return NotFound();
        }

        card.ArchivedUtc = DateTimeOffset.UtcNow;
        card.UpdatedUtc = card.ArchivedUtc.Value;
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<CardDetailResponse> GetCardResponse(
        int id,
        string userId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Cards
            .AsNoTracking()
            .Where(card => card.Id == id && card.CreatedByUserId == userId && card.ArchivedUtc == null)
            .Select(card => new CardDetailResponse
            {
                Id = card.Id,
                Title = card.Title,
                Prompt = card.Prompt,
                PaletteId = card.PaletteId,
                Palette = new CardPaletteResponse
                {
                    Id = card.Palette.Id,
                    Name = card.Palette.Name,
                    Colors = card.Palette.Colors
                        .OrderBy(color => color.SortOrder)
                        .Select(color => new PaletteColorResponse
                        {
                            Id = color.Id,
                            Name = color.Name,
                            Hex = color.Hex,
                            SortOrder = color.SortOrder
                        })
                        .ToList()
                },
                SkipNumber = card.SkipNumber,
                HintNumber = card.HintNumber,
                ActionType = card.ActionType,
                DeckOrder = card.DeckOrder,
                CreatedUtc = card.CreatedUtc,
                UpdatedUtc = card.UpdatedUtc
            })
            .SingleAsync(cancellationToken);
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Authenticated user is missing a name identifier claim.");
    }

    private async Task<ActionResult?> ValidateCard(
        CardSaveRequest request,
        string userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            ModelState.AddModelError(nameof(request.Title), "Card title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            ModelState.AddModelError(nameof(request.Prompt), "Card prompt is required.");
        }

        if (request.SkipNumber is < 1 or > 9)
        {
            ModelState.AddModelError(nameof(request.SkipNumber), "Skip number must be between 1 and 9.");
        }

        if (request.HintNumber is < 1 or > 9)
        {
            ModelState.AddModelError(nameof(request.HintNumber), "Hint number must be between 1 and 9.");
        }

        if (request.DeckOrder < 0)
        {
            ModelState.AddModelError(nameof(request.DeckOrder), "Deck order cannot be negative.");
        }

        if (string.IsNullOrWhiteSpace(request.ActionType) || !CardActionTypes.All.Contains(request.ActionType.Trim()))
        {
            ModelState.AddModelError(nameof(request.ActionType), "Card action type is invalid.");
        }

        var paletteExists = await dbContext.Palettes
            .AnyAsync(
                palette => palette.Id == request.PaletteId
                    && palette.CreatedByUserId == userId
                    && palette.ArchivedUtc == null,
                cancellationToken);

        if (!paletteExists)
        {
            ModelState.AddModelError(nameof(request.PaletteId), "Palette is required.");
        }

        return ModelState.IsValid ? null : ValidationProblem(ModelState);
    }
}

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

public class CardDetailResponse : CardSummaryResponse
{
    public DateTimeOffset CreatedUtc { get; set; }
}

public class CardPaletteResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<PaletteColorResponse> Colors { get; set; } = [];
}
