using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using pmp.AppDb;

namespace pmp.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public partial class PalettesController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PaletteSummaryResponse>>> GetPalettes(
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var palettes = await dbContext.Palettes
            .AsNoTracking()
            .Where(palette => palette.CreatedByUserId == userId && palette.ArchivedUtc == null)
            .OrderBy(palette => palette.Name)
            .Select(palette => new PaletteSummaryResponse
            {
                Id = palette.Id,
                Name = palette.Name,
                Description = palette.Description,
                UpdatedUtc = palette.UpdatedUtc,
                Colors = palette.Colors
                    .OrderBy(color => color.SortOrder)
                    .Select(color => new PaletteColorResponse
                    {
                        Id = color.Id,
                        Name = color.Name,
                        Hex = color.Hex,
                        SortOrder = color.SortOrder
                    })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(palettes);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PaletteDetailResponse>> GetPalette(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var palette = await dbContext.Palettes
            .AsNoTracking()
            .Where(palette => palette.Id == id && palette.CreatedByUserId == userId && palette.ArchivedUtc == null)
            .Select(palette => new PaletteDetailResponse
            {
                Id = palette.Id,
                Name = palette.Name,
                Description = palette.Description,
                CreatedUtc = palette.CreatedUtc,
                UpdatedUtc = palette.UpdatedUtc,
                Colors = palette.Colors
                    .OrderBy(color => color.SortOrder)
                    .Select(color => new PaletteColorResponse
                    {
                        Id = color.Id,
                        Name = color.Name,
                        Hex = color.Hex,
                        SortOrder = color.SortOrder
                    })
                    .ToList()
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (palette is null)
        {
            return NotFound();
        }

        return Ok(palette);
    }

    [HttpPost]
    [ProducesResponseType<PaletteDetailResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PaletteDetailResponse>> CreatePalette(
        PaletteSaveRequest request,
        CancellationToken cancellationToken)
    {
        var validationResult = ValidatePalette(request);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var now = DateTimeOffset.UtcNow;
        var palette = new Palette
        {
            Name = request.Name.Trim(),
            Description = NormalizeOptionalText(request.Description),
            CreatedByUserId = GetUserId(),
            CreatedUtc = now,
            UpdatedUtc = now,
            Colors = request.Colors
                .Select((color, index) => new PaletteColor
                {
                    Name = color.Name.Trim(),
                    Hex = NormalizeHex(color.Hex),
                    SortOrder = index
                })
                .ToList()
        };

        dbContext.Palettes.Add(palette);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = PaletteDetailResponse.FromPalette(palette);
        return CreatedAtAction(nameof(GetPalette), new { id = palette.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PaletteDetailResponse>> UpdatePalette(
        int id,
        PaletteSaveRequest request,
        CancellationToken cancellationToken)
    {
        var validationResult = ValidatePalette(request);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var userId = GetUserId();
        var palette = await dbContext.Palettes
            .Include(palette => palette.Colors)
            .SingleOrDefaultAsync(
                palette => palette.Id == id && palette.CreatedByUserId == userId && palette.ArchivedUtc == null,
                cancellationToken);

        if (palette is null)
        {
            return NotFound();
        }

        palette.Name = request.Name.Trim();
        palette.Description = NormalizeOptionalText(request.Description);
        palette.UpdatedUtc = DateTimeOffset.UtcNow;

        palette.Colors.Clear();
        foreach (var color in request.Colors.Select((value, index) => new { value, index }))
        {
            palette.Colors.Add(new PaletteColor
            {
                Name = color.value.Name.Trim(),
                Hex = NormalizeHex(color.value.Hex),
                SortOrder = color.index
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(PaletteDetailResponse.FromPalette(palette));
    }

    [HttpPost("{id:int}/archive")]
    public async Task<IActionResult> ArchivePalette(
        int id,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var palette = await dbContext.Palettes
            .SingleOrDefaultAsync(
                palette => palette.Id == id && palette.CreatedByUserId == userId && palette.ArchivedUtc == null,
                cancellationToken);

        if (palette is null)
        {
            return NotFound();
        }

        palette.ArchivedUtc = DateTimeOffset.UtcNow;
        palette.UpdatedUtc = palette.ArchivedUtc.Value;
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Authenticated user is missing a name identifier claim.");
    }

    private ActionResult? ValidatePalette(PaletteSaveRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            ModelState.AddModelError(nameof(request.Name), "Palette name is required.");
        }

        if (request.Colors.Count == 0)
        {
            ModelState.AddModelError(nameof(request.Colors), "At least one color is required.");
        }

        var colorNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < request.Colors.Count; i++)
        {
            var color = request.Colors[i];
            if (string.IsNullOrWhiteSpace(color.Name))
            {
                ModelState.AddModelError($"Colors[{i}].Name", "Color name is required.");
            }
            else if (!colorNames.Add(color.Name.Trim()))
            {
                ModelState.AddModelError($"Colors[{i}].Name", "Color names must be unique within a palette.");
            }

            if (!HexColorRegex().IsMatch(color.Hex.Trim()))
            {
                ModelState.AddModelError($"Colors[{i}].Hex", "Color hex must be in #RRGGBB format.");
            }
        }

        return ModelState.IsValid ? null : ValidationProblem(ModelState);
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string NormalizeHex(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColorRegex();
}

public class PaletteSaveRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public List<PaletteColorSaveRequest> Colors { get; set; } = [];
}

public class PaletteColorSaveRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Hex { get; set; } = string.Empty;
}

public class PaletteSummaryResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }

    public List<PaletteColorResponse> Colors { get; set; } = [];
}

public class PaletteDetailResponse : PaletteSummaryResponse
{
    public DateTimeOffset CreatedUtc { get; set; }

    public static PaletteDetailResponse FromPalette(Palette palette)
    {
        return new PaletteDetailResponse
        {
            Id = palette.Id,
            Name = palette.Name,
            Description = palette.Description,
            CreatedUtc = palette.CreatedUtc,
            UpdatedUtc = palette.UpdatedUtc,
            Colors = palette.Colors
                .OrderBy(color => color.SortOrder)
                .Select(color => new PaletteColorResponse
                {
                    Id = color.Id,
                    Name = color.Name,
                    Hex = color.Hex,
                    SortOrder = color.SortOrder
                })
                .ToList()
        };
    }
}

public class PaletteColorResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Hex { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
