using System.ComponentModel.DataAnnotations;

namespace pmp.Server.Model.Auth;

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
