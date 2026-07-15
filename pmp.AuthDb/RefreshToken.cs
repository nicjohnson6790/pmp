namespace pmp.AuthDb;

public class RefreshToken
{
    public Guid Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset CreatedUtc { get; set; }

    public DateTimeOffset ExpiresUtc { get; set; }

    public DateTimeOffset? RevokedUtc { get; set; }

    public string? ReplacedByTokenHash { get; set; }

    public string? CreatedByIp { get; set; }

    public string? RevokedByIp { get; set; }

    public bool IsActive => RevokedUtc is null && ExpiresUtc > DateTimeOffset.UtcNow;
}
