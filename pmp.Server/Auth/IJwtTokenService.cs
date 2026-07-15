using pmp.AuthDb;

namespace pmp.Server.Auth;

public interface IJwtTokenService
{
    Task<AuthResult> CreateTokenPairAsync(ApplicationUser user, string? ipAddress, CancellationToken cancellationToken);

    Task<AuthResult?> RefreshTokenPairAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken);

    Task<bool> RevokeRefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken);
}
