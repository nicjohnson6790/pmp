using Microsoft.AspNetCore.Identity;

namespace pmp.AuthDb;

public class ApplicationUser : IdentityUser
{
    public ICollection<RefreshToken> RefreshTokens { get; } = new List<RefreshToken>();
}
