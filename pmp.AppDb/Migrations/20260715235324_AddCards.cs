using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace pmp.AppDb.Migrations
{
    /// <inheritdoc />
    public partial class AddCards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Prompt = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    PaletteId = table.Column<int>(type: "int", nullable: false),
                    SkipNumber = table.Column<int>(type: "int", nullable: false),
                    HintNumber = table.Column<int>(type: "int", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DeckOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ArchivedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cards_Palettes_PaletteId",
                        column: x => x.PaletteId,
                        principalTable: "Palettes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cards_CreatedByUserId_ArchivedUtc",
                table: "Cards",
                columns: new[] { "CreatedByUserId", "ArchivedUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Cards_CreatedByUserId_DeckOrder",
                table: "Cards",
                columns: new[] { "CreatedByUserId", "DeckOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Cards_PaletteId",
                table: "Cards",
                column: "PaletteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cards");
        }
    }
}
