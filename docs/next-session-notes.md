# Next Session Notes

This is a handoff note for continuing the tile/editor work.

## Current State

- Latest completed commits:
  - `23b73e3 Add tile scaffold`
  - `5e61bed Add tile editor entry shell`
  - `d5149bb Document tile editor handoff`
  - `447d5c4 Move API DTOs into server model folders`
- Current uncommitted work adds the first shared drawing document foundation on the client.
- `AddTiles` has been applied to the local `pmp.AppDb` database.
- `npm run build` passed after the drawing foundation work.
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
  - A landscape canvas rendering a static drawing document.
  - Placeholder creation tool rail: brush, polyline, circle, polygon.
  - A minimal layer manager list that owns selection.
- `pmp.client/src/editor` contains:
  - `drawingTypes.ts` with the first `DrawingDocument`, group, shape, transform, point, and style types.
  - `drawingTree.ts` with flatten/find helpers.
  - `drawingRender.ts` with a canvas renderer for circle, polyline, polygon, and brush shapes.
  - `sampleDrawingDocument.ts` with a hardcoded tile document.
- `DrawingCanvas.vue` renders the document to a `<canvas>`.
- `LayerManager.vue` displays the flattened layer tree and emits selection changes.
- Selecting a shape in the layer manager highlights that shape and its control points on the canvas.

## Important Decisions

- The current tile CRUD/browser is a test harness, not final UX.
- Selection should happen through the layer manager, not a select tool button.
- The editor route is client-side context only; it is not a persisted backend edit session.
- No new npm packages were added for the tile/editor shell.
- The first drawing foundation is still client-only and uses a static sample document.
- Canvas selection is currently driven by the layer manager only; canvas hit-testing is not implemented yet.

## Recommended Next Slice

Build the first document mutation path:

1. Add a small editor store/composable to own the document, selection, active tool, and style state.
2. Move the static sample document into that store as initial state.
3. Let the layer manager select both groups and shapes, with group selection highlighting its child bounds or render order clearly.
4. Add one creation tool end to end, likely circle or polyline first.
5. Keep created shape colors constrained to the active card palette.

Keep this client-only at first. Persisting drafts, edit sessions, locks, and changed-pixel limits should wait until the document shape, renderer, and first mutation path feel stable.
