using pmp.Server.Auth;

namespace pmp.Server.Model.Auth;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;

    public DateTimeOffset AccessTokenExpiresUtc { get; set; }

    public string RefreshToken { get; set; } = string.Empty;

    public DateTimeOffset RefreshTokenExpiresUtc { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public static AuthResponse FromAuthResult(AuthResult result)
    {
        return new AuthResponse
        {
            AccessToken = result.AccessToken,
            AccessTokenExpiresUtc = result.AccessTokenExpiresUtc,
            RefreshToken = result.RefreshToken,
            RefreshTokenExpiresUtc = result.RefreshTokenExpiresUtc,
            UserName = result.UserName,
            Email = result.Email
        };
    }
}
