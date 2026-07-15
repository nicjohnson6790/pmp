using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace pmp.AppDb;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string LocalDbConnectionString =
        "Server=(localdb)\\mssqllocaldb;Database=pmp.AppDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(LocalDbConnectionString)
            .Options;

        return new AppDbContext(options);
    }
}
