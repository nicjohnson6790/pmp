using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace pmp.AppDb.Migrations
{
    /// <inheritdoc />
    public partial class InitialAppSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Palettes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ArchivedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Palettes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaletteColors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PaletteId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Hex = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaletteColors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaletteColors_Palettes_PaletteId",
                        column: x => x.PaletteId,
                        principalTable: "Palettes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaletteColors_PaletteId_Name",
                table: "PaletteColors",
                columns: new[] { "PaletteId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaletteColors_PaletteId_SortOrder",
                table: "PaletteColors",
                columns: new[] { "PaletteId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Palettes_CreatedByUserId_ArchivedUtc",
                table: "Palettes",
                columns: new[] { "CreatedByUserId", "ArchivedUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaletteColors");

            migrationBuilder.DropTable(
                name: "Palettes");
        }
    }
}
