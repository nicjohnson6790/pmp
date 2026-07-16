# Next Session Notes

This is a handoff note for continuing the tile/editor work.

## Current State

- Latest completed commits:
  - `23b73e3 Add tile scaffold`
  - `5e61bed Add tile editor entry shell`
  - `d5149bb Document tile editor handoff`
  - `447d5c4 Move API DTOs into server model folders`
  - `6dda2a3 Add static drawing editor foundation`
- The circle creation tool slice is checked in after the static drawing foundation.
- `AddTiles` has been applied to the local `pmp.AppDb` database.
- `npm run build` passed after the circle creation work.
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
  - `useDrawingDocument.ts` with the first editor store/composable for document state, selection, active tool, active color, and circle creation.
- `DrawingCanvas.vue` renders the document to a `<canvas>`.
- `LayerManager.vue` displays the flattened layer tree and emits selection changes.
- Selecting a shape in the layer manager highlights that shape and its control points on the canvas.
- The circle tool is the first working creation tool:
  - Select a card palette swatch to choose the active color.
  - Drag on the canvas to add a circle.
  - The new circle is inserted at the top-level document order and selected immediately.
- Selecting a layer automatically activates edit mode.
- Selected shapes render a filled base control point plus normal outline control points.
- For selected circles:
  - Dragging the base control point moves the whole circle.
  - Dragging the radius control point resizes the circle.
- Undo/redo uses shared document snapshots for circle creation, circle moves, and circle radius edits.

## Important Decisions

- The current tile CRUD/browser is a test harness, not final UX.
- Selection should happen through the layer manager, not a select tool button.
- The editor route is client-side context only; it is not a persisted backend edit session.
- No new npm packages were added for the tile/editor shell.
- The drawing editor is still client-only and starts from a static sample document.
- Canvas selection should stay layer-manager-only. Do not add click-to-select hit-testing on the canvas.
- Selecting a layer should automatically put the editor into a move/control-point editing mode.
- Every editable shape should have a distinct base control point. Dragging the base point repositions the whole shape; dragging normal control points only moves that one point.
- Only circle creation mutates the document. Brush, polyline, and polygon buttons are disabled placeholders.
- Undo/redo should be designed as a shared editor-history system for all edit actions, not a one-off circle-only stack.

## Recommended Next Slice

Build the next editing path:

1. Extend control-point editing to polyline, polygon, and brush shapes.
2. Add delete selected shape and make it undoable.
3. Start extracting the editor toolbar into a small component once tool controls grow beyond the current prototype rail.
4. Add tests for document mutations and history once the store stabilizes around multiple shape types.

Keep this client-only at first. Persisting drafts, edit sessions, locks, and changed-pixel limits should wait until the document shape, renderer, and first mutation path feel stable.
