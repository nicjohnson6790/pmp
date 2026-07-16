using System.ComponentModel.DataAnnotations;

namespace pmp.Server.Model.Auth;

public class RegisterRequest
{
    [Required]
    public string UserName { get; set; } = string.Empty;

    [Required]
    [MinLength(12)]
    public string Password { get; set; } = string.Empty;

    [EmailAddress]
    public string? Email { get; set; }
}
