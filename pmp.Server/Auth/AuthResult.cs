namespace pmp.Server.Auth;

public record AuthResult(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresUtc,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresUtc,
    string UserName,
    string? Email);
