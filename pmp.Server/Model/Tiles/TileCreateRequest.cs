using System.ComponentModel.DataAnnotations;

namespace pmp.Server.Model.Tiles;

public class TileCreateRequest
{
    public int X { get; set; }

    public int Y { get; set; }

    [MaxLength(1000)]
    public string? CurrentImagePath { get; set; }
}
