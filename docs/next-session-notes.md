# Next Session Notes

This is a handoff note for continuing the tile/editor work.

## Current State

- Latest completed commits:
  - `23b73e3 Add tile scaffold`
  - `5e61bed Add tile editor entry shell`
- Working tree was clean after the editor entry shell commit.
- `AddTiles` has been applied to the local `pmp.AppDb` database.
- `npm run build` passed after the editor shell work.
- `dotnet build pmp.slnx` passed after the tile API work. NSwag generation emits the existing `wwwroot` warning but succeeds.

## Implemented

- `Tile` entity and `TileStatuses` in `pmp.AppDb`.
- EF migration `20260716004632_AddTiles`.
- `TilesController` with:
  - `GET /api/tiles`
  - `GET /api/tiles/{id}`
  - `POST /api/tiles`
  - `POST /api/tiles/{id}/archive`
- Generated TypeScript client includes `TilesClient`.
- `/tiles` route has a temporary tile coordinate CRUD/browser.
- Tile detail can choose a card and open `/tiles/:tileId/editor/:cardId`.
- `TileEditorWorkspace.vue` loads the selected tile and card and shows:
  - Active card prompt.
  - Skip/hint numbers.
  - Palette swatches.
  - Placeholder landscape tile canvas.
  - Placeholder creation tool rail: brush, polyline, circle, polygon.
  - Empty layer manager panel.

## Important Decisions

- The current tile CRUD/browser is a test harness, not final UX.
- Selection should happen through the layer manager, not a select tool button.
- The editor route is client-side context only; it is not a persisted backend edit session.
- No new npm packages were added for the tile/editor shell.

## Recommended Next Slice

Build the shared drawing document foundation:

1. Add `pmp.client/src/editor/drawingTypes.ts`.
2. Define `DrawingDocument`, `GroupNode`, `ShapeNode`, `Transform`, `Point`, and style types.
3. Add a static hardcoded document in the editor shell.
4. Add `DrawingCanvas.vue` or a small canvas renderer module to draw that document.
5. Add a minimal layer manager list that owns selection and highlights the selected item on the canvas.

Keep this client-only at first. Persisting drafts, edit sessions, locks, and changed-pixel limits should wait until the document shape and basic renderer feel stable.
