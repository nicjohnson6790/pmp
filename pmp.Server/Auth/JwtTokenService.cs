using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using pmp.AuthDb;

namespace pmp.Server.Auth;

public class JwtTokenService(
    AuthDbContext dbContext,
    IOptions<JwtOptions> jwtOptions) : IJwtTokenService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    public async Task<AuthResult> CreateTokenPairAsync(
        ApplicationUser user,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var accessTokenExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes);
        var refreshTokenExpiresUtc = DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays);
        var refreshToken = CreateRefreshToken();

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(refreshToken),
            CreatedUtc = DateTimeOffset.UtcNow,
            ExpiresUtc = refreshTokenExpiresUtc,
            CreatedByIp = ipAddress
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResult(
            CreateAccessToken(user, accessTokenExpiresUtc),
            accessTokenExpiresUtc,
            refreshToken,
            refreshTokenExpiresUtc,
            user.UserName ?? string.Empty,
            user.Email);
    }

    public async Task<AuthResult?> RefreshTokenPairAsync(
        string refreshToken,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var refreshTokenHash = HashToken(refreshToken);
        var storedRefreshToken = await dbContext.RefreshTokens
            .Include(token => token.User)
            .SingleOrDefaultAsync(token => token.TokenHash == refreshTokenHash, cancellationToken);

        if (storedRefreshToken is null || !storedRefreshToken.IsActive)
        {
            return null;
        }

        var replacementRefreshToken = CreateRefreshToken();
        var replacementRefreshTokenHash = HashToken(replacementRefreshToken);
        var refreshTokenExpiresUtc = DateTimeOffset.UtcNow.AddDays(_jwtOptions.RefreshTokenDays);
        var accessTokenExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes);

        storedRefreshToken.RevokedUtc = DateTimeOffset.UtcNow;
        storedRefreshToken.RevokedByIp = ipAddress;
        storedRefreshToken.ReplacedByTokenHash = replacementRefreshTokenHash;

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = storedRefreshToken.UserId,
            TokenHash = replacementRefreshTokenHash,
            CreatedUtc = DateTimeOffset.UtcNow,
            ExpiresUtc = refreshTokenExpiresUtc,
            CreatedByIp = ipAddress
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResult(
            CreateAccessToken(storedRefreshToken.User, accessTokenExpiresUtc),
            accessTokenExpiresUtc,
            replacementRefreshToken,
            refreshTokenExpiresUtc,
            storedRefreshToken.User.UserName ?? string.Empty,
            storedRefreshToken.User.Email);
    }

    public async Task<bool> RevokeRefreshTokenAsync(
        string refreshToken,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var refreshTokenHash = HashToken(refreshToken);
        var storedRefreshToken = await dbContext.RefreshTokens
            .SingleOrDefaultAsync(token => token.TokenHash == refreshTokenHash, cancellationToken);

        if (storedRefreshToken is null || !storedRefreshToken.IsActive)
        {
            return false;
        }

        storedRefreshToken.RevokedUtc = DateTimeOffset.UtcNow;
        storedRefreshToken.RevokedByIp = ipAddress;

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private string CreateAccessToken(ApplicationUser user, DateTimeOffset expiresUtc)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? string.Empty)
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            _jwtOptions.Issuer,
            _jwtOptions.Audience,
            claims,
            expires: expiresUtc.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string CreateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    private static string HashToken(string token)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(token);
        return Convert.ToHexString(SHA256.HashData(tokenBytes));
    }
}
