# Next Session Notes

This is a handoff note for continuing the tile/editor work.

## Current State

- Latest completed commits:
  - `e85e4a1 Add circle creation tool`
  - `0506d5d Add circle edit history controls`
  - `f2a3e23 Add basic layer edit shortcuts`
- Recent local editor work after those commits extracted editor UI boundaries, added store tests, and added point-based polyline/polygon creation.
- `AddTiles` has been applied to the local `pmp.AppDb` database.
- `npm run test` and `npm run build` passed after the polyline/polygon and editor extraction work.
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
  - Extracted editor tool rail with edit, move, brush placeholder, polyline, circle, polygon, finish, undo, redo, and delete.
  - A minimal layer manager list that owns selection.
  - Extracted collapsible editor context panel for tile/card context, navigation, active card, and palette.
- `pmp.client/src/editor` contains:
  - `drawingTypes.ts` with the first `DrawingDocument`, group, shape, transform, point, and style types.
  - `drawingTree.ts` with flatten/find helpers.
  - `drawingRender.ts` with a canvas renderer for circle, polyline, polygon, and brush shapes.
  - `sampleDrawingDocument.ts` with a hardcoded tile document.
  - `useDrawingDocument.ts` with the first editor store/composable for document state, selection, active tool, active color, circle creation, point-shape creation, movement, deletion, and history.
  - `useDrawingDocument.test.ts` with store-level tests for create, move, point edit, delete, undo/redo, polyline, and polygon behavior.
- `DrawingCanvas.vue` renders the document to a `<canvas>`.
- `LayerManager.vue` displays the flattened layer tree and emits selection changes.
- Selecting a shape in the layer manager highlights that shape and its control points on the canvas.
- Working creation tools:
  - Select a card palette swatch to choose the active color.
  - Drag on the canvas to add a circle.
  - Click to add polyline or polygon points, then finish with Enter, double-click, right-click, or the tool-rail finish button.
  - New shapes are inserted at the top-level document order and selected immediately.
- Selecting a layer automatically activates edit mode.
- Selected shapes render uniform control points.
- Edit mode drags individual control points.
- Move mode drags all points in the selected shape at once.
- Undo/redo uses shared document snapshots for circle creation, shape moves, and control-point edits.
- Control-point editing now applies to all first-pass point-based shapes:
  - Dragging normal control points moves individual points.
- Delete selected layer is available from the tool rail and is undoable.
- Keyboard shortcuts:
  - `Delete` / `Backspace`: delete selected layer.
  - `Ctrl+Z` / `Cmd+Z`: undo.
  - `Ctrl+Y` / `Cmd+Y` and `Ctrl+Shift+Z` / `Cmd+Shift+Z`: redo.
  - `Enter`: finish the current polyline or polygon draft.
- The editor context is in a collapsible left panel that contains the title, tile/card context, back link, active card, and palette.
- The drawing canvas expands into the freed space when the context panel is collapsed.

## Important Decisions

- The current tile CRUD/browser is a test harness, not final UX.
- Selection should happen through the layer manager, not a select tool button.
- The editor route is client-side context only; it is not a persisted backend edit session.
- Vitest is now the client-side store test runner.
- The drawing editor is still client-only and starts from a static sample document.
- Canvas selection should stay layer-manager-only. Do not add click-to-select hit-testing on the canvas.
- Selecting a layer should automatically put the editor into control-point editing mode.
- Whole-shape movement should happen through the move tool, not through a special base control point.
- Control points should all act as editable geometry points so none become hidden offscreen as a shape's implicit move handle.
- Keep the editor workspace canvas-first. Context belongs in a collapsible side panel so the drawing area can stay large.
- Brush and text remain future tools. Circle, polyline, and polygon creation mutate the document.
- Text should eventually be a first-class layer type. A promising interaction model is a baseline control point plus a height/orientation control point; the vector between them can define text size and rotation.
- Undo/redo should be designed as a shared editor-history system for all edit actions, not a one-off circle-only stack.
- The palette should remain reachable when the left context panel is collapsed, likely as a compact swatch strip or popover near the tool rail.

## Recommended Next Slice

Build the next editing path:

1. Add layer renaming from the layer manager and make it undoable.
2. Add selected-layer style editing for stroke width, stroke color, and fill color where the selected shape type supports those properties.
3. Keep palette access available when the left context panel is collapsed.
4. Add reorder support in the layer manager, then make reorder undoable.
5. Add brush and text creation once point-based tools and style editing feel stable. Text should support rotation, likely through baseline and height/orientation control points.

Keep this client-only at first. Persisting drafts, edit sessions, locks, and changed-pixel limits should wait until the document shape, renderer, and first mutation path feel stable.
