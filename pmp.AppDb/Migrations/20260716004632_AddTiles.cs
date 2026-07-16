using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace pmp.AppDb.Migrations
{
    /// <inheritdoc />
    public partial class AddTiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Tiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    X = table.Column<int>(type: "int", nullable: false),
                    Y = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CurrentImagePath = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CurrentRevisionId = table.Column<int>(type: "int", nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ArchivedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    LockExpiresUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ActiveEditSessionId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tiles", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tiles_CreatedByUserId_ArchivedUtc",
                table: "Tiles",
                columns: new[] { "CreatedByUserId", "ArchivedUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Tiles_Status_LockExpiresUtc",
                table: "Tiles",
                columns: new[] { "Status", "LockExpiresUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Tiles_X_Y",
                table: "Tiles",
                columns: new[] { "X", "Y" },
                unique: true,
                filter: "[ArchivedUtc] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Tiles");
        }
    }
}
