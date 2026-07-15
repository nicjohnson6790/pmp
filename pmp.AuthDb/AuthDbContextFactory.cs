using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace pmp.AuthDb;

public class AuthDbContextFactory : IDesignTimeDbContextFactory<AuthDbContext>
{
    private const string LocalDbConnectionString =
        "Server=(localdb)\\mssqllocaldb;Database=pmp.AuthDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

    public AuthDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AuthDbContext>()
            .UseSqlServer(LocalDbConnectionString)
            .Options;

        return new AuthDbContext(options);
    }
}
