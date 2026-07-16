using System.ComponentModel.DataAnnotations;

namespace pmp.Server.Model.Palettes;

public class PaletteSaveRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public List<PaletteColorSaveRequest> Colors { get; set; } = [];
}
