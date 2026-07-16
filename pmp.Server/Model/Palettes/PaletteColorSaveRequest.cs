using System.ComponentModel.DataAnnotations;

namespace pmp.Server.Model.Palettes;

public class PaletteColorSaveRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Hex { get; set; } = string.Empty;
}
