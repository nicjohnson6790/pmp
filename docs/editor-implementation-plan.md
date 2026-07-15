# Implementation Plan: Palette, Card, and Tile Editors

This plan turns the feature TODO into buildable slices. The intended order is conservative: establish the data model and simple CRUD editors first, then build the shared drawing system once palettes and cards can feed it real data.

## Guiding Architecture

- Keep palettes, cards, and tiles as separate server domains with explicit DTOs.
- Use generated TypeScript API clients after each backend API milestone.
- Put shared drawing types and editor logic in client modules that can be reused by both tile editing and card artwork editing.
- Keep the layer-list document as the long-term editable source of truth.
- Treat rendered images as derived artifacts. Only the newest tile image is persisted for fast display.
- Copy palette colors into drawing shapes when used. Tile/card artwork must not reference palette colors live.

## Current Midpoint

Palette CRUD is the first working product slice. `pmp.AppDb` exists for app-domain data, palette tables have an initial migration, the server exposes authenticated palette endpoints, NSwag generates the palette client, and the Vue app has a usable palette workspace with create/edit/archive, color validation, swatches, and reorder controls.

Next implementation focus: card CRUD/editor using the saved palettes.

## Phase 1: Shared Domain Conventions

### Backend

- Add a small set of shared entity conventions:
  - `CreatedUtc`
  - `UpdatedUtc`
  - `CreatedByUserId`
  - `ArchivedUtc` where soft deletion is useful
- Keep product entities in `pmp.AppDb`.
- Add helpers for reading the current user ID from claims.
- Add consistent controller response patterns for list/detail/create/update/archive.

### Frontend

- Add simple authenticated shell navigation:
  - Palettes
  - Cards
  - Tiles
- Add shared form helpers for loading/error/saving states.
- Add a small route/view pattern before introducing a router, or add Vue Router if navigation starts feeling awkward.

### Validation

- `dotnet build pmp.slnx`
- `npm run build`
- NSwag generated client updates are committed with API changes.

## Phase 2: Palette Editor

Palettes are the lowest-risk first editor because they do not depend on cards or tiles.

### Data Model

- `Palette`
  - `Id`
  - `Name`
  - `Description`
  - `CreatedByUserId`
  - `CreatedUtc`
  - `UpdatedUtc`
  - `ArchivedUtc`
- `PaletteColor`
  - `Id`
  - `PaletteId`
  - `Name`
  - `Hex`
  - `SortOrder`

### Backend API

- `GET /api/palettes`
- `GET /api/palettes/{id}`
- `POST /api/palettes`
- `PUT /api/palettes/{id}`
- `POST /api/palettes/{id}/archive`

### Frontend Editor

- Palette list view:
  - Name
  - Color strip preview
  - Edit/archive actions
- Palette editor:
  - Name and description fields
  - Add/remove/reorder colors
  - Hex input
  - Swatch preview
  - Color name
  - Save/cancel

### Implementation Notes

- Validate hex colors on both client and server.
- Require at least one color.
- Copy color rows as ordered child records on update.
- Keep semantic color roles out of the first pass unless they become clearly necessary.

## Phase 3: Card Editor

Cards depend on palettes and become the entry point into tile/card actions.

### Data Model

- `Card`
  - `Id`
  - `Title`
  - `Prompt`
  - `PaletteId`
  - `SkipNumber` from `1` to `9`
  - `HintNumber` from `1` to `9`
  - `ActionType`: `normal`, `shuffleDeck`, `createTile`, `createCard`
  - `DeckOrder`
  - `CreatedByUserId`
  - `CreatedUtc`
  - `UpdatedUtc`
  - `ArchivedUtc`
- Optional later:
  - `Category`
  - `Difficulty`
  - `RuleJson`
  - `ArtworkDocumentJson`

### Backend API

- `GET /api/cards`
- `GET /api/cards/{id}`
- `POST /api/cards`
- `PUT /api/cards/{id}`
- `POST /api/cards/{id}/archive`

### Frontend Editor

- Card list view:
  - Title
  - Action type
  - Skip/hint numbers
  - Palette preview
  - Deck order
- Card editor:
  - Title
  - Prompt/rule text
  - Palette picker with swatches
  - Skip number selector
  - Hint number selector
  - Action type selector
  - Preview card panel

### Implementation Notes

- Start with text/palette/numbers/action. Add card artwork once the shared drawing editor exists.
- Shuffle cards can be system-like cards in the first pass unless we decide they need artwork/palette.
- User-created proposed cards and voting stay out of the first CRUD pass, but the schema should not block them later.

## Phase 4: Shared Drawing Document

Build this as reusable TypeScript logic before tying it deeply to tile APIs.

### TypeScript Modules

- `src/editor/drawingTypes.ts`
  - Document, group, shape, style, transform, point types.
- `src/editor/drawingTransforms.ts`
  - Matrix helpers.
  - World/local coordinate conversion.
  - Bake parent transform into child.
  - Apply inverse parent transform when moving into a group.
- `src/editor/drawingRender.ts`
  - Draw document to canvas.
  - Flatten render order.
  - Draw selection/control handles.
- `src/editor/drawingHistory.ts`
  - Undo/redo stack.
  - Command or snapshot strategy.
- `src/editor/useDrawingDocument.ts`
  - Store/composable owning document, selection, history, active tool, and mutations.

### First Document Schema

- `DrawingDocument`
  - `version`
  - `width`
  - `height`
  - `background`
  - `nodes`
- `GroupNode`
  - `id`
  - `type: "group"`
  - `name`
  - `transform`
  - `children`
- `ShapeNode`
  - `id`
  - `type: "shape"`
  - `shapeType: "circle" | "polyline" | "polygon" | "brush"`
  - `name`
  - `transform`
  - `style`
  - `points`

### Components

- `DrawingCanvas.vue`
  - Owns canvas rendering and pointer math.
  - Emits interaction intents.
  - Does not mutate document state directly.
- `LayerManager.vue`
  - Shows nested groups/shapes.
  - Handles selection.
  - Supports drag/drop reorder and nesting.
- `ToolRail.vue`
  - Select, move/transform, brush, polyline, circle, polygon, eyedropper, pan/zoom.
- `PaletteSwatches.vue`
  - Displays available copied colors from the active card palette.
- `DrawingEditorShell.vue`
  - Composes canvas, tools, layer manager, palette, and contextual panels.

### Build Order

1. Static rendering of a hardcoded document.
2. Selection from layer manager.
3. Selection from canvas hit testing.
4. Create polygon/polyline/brush/circle.
5. Edit control points.
6. Undo/redo for document mutations.
7. Group/ungroup.
8. Drag/drop reorder.
9. Move nodes into/out of groups with transform preservation.
10. Group move/rotate/resize.

## Phase 5: Tile Model and Tile Browser

### Data Model

- `Tile`
  - `Id`
  - `X`
  - `Y`
  - `CurrentRevisionId`
  - `CurrentImagePath` or blob metadata
  - `LockedByUserId`
  - `LockExpiresUtc`
  - `ActiveEditSessionId`
  - timestamps
- `TileRevision`
  - `Id`
  - `TileId`
  - `EditSessionId`
  - `DrawingDocumentJson`
  - `ImagePath` for current/latest only, or metadata to current artifact
  - `CompletedUtc`
  - `ExpiredUtc`
- `MapState`
  - `Id`
  - `ActiveTileId`
  - settings such as lock duration, autosave interval, edit limit

### Backend API

- `GET /api/tiles`
- `GET /api/tiles/{id}`
- `GET /api/tiles/grid`

### Frontend

- Tile browser grid:
  - Integer `(x, y)` coordinates.
  - Current tile thumbnails.
  - Locked/available status.
  - Holes are allowed.
- Tile detail:
  - Current image.
  - Revision metadata summary.

## Phase 6: Card Draw and Edit Sessions

### Data Model

- `EditSession`
  - `Id`
  - `UserId`
  - `CardId`
  - `CardTitleSnapshot`
  - `CardPromptSnapshot`
  - `SkipNumberSnapshot`
  - `HintNumberSnapshot`
  - `PaletteSnapshotJson`
  - `TileId`
  - `ActiveTileBeforeId`
  - `ActiveTileAfterId`
  - `StartedUtc`
  - `LockExpiresUtc`
  - `LastSavedUtc`
  - `CompletedUtc`
  - `ExpiredUtc`
  - `DrawingDocumentJson`

### Backend API

- `POST /api/edit-sessions/request-card`
- `GET /api/edit-sessions/{id}`
- `POST /api/edit-sessions/{id}/save-draft`
- `POST /api/edit-sessions/{id}/complete`
- `POST /api/edit-sessions/{id}/place-new-tile`

### Rules

- Normal drawn cards move to the bottom of the deck immediately.
- Shuffle cards shuffle the deck and stop.
- Normal edit cards advance the global active tile cursor by tile primary key order.
- Assignment linearly searches for the next open tile.
- Create-tile sessions require open 4-way adjacency and do not update the global active tile cursor.
- Save renews the configurable lock, initially `36` hours.
- Autosave interval defaults to `5` minutes.

## Phase 7: Tile Editor

### Frontend

- `TileEditorView.vue`
  - Loads edit session.
  - Shows card prompt, skip number, hint number, assigned tile coordinate, lock timer.
  - Shows starting tile image as bottom visual layer or locked background layer.
  - Passes palette colors into shared drawing editor.
  - Tracks live changed-pixel percentage against the starting image.
  - Blocks manual save/autosave when over limit.
  - Sends only layer-list JSON to the server.
- Save behavior:
  - Manual save button.
  - Autosave every `5` minutes.
  - Save renews lock.
  - Completion is separate from save if we decide to require explicit finish.

### Backend Rendering

- Server renders the latest image from the layer-list document.
- Server compares rendered image RGB values against the edit-session starting image.
- Server rejects saves over the configured changed-pixel limit.
- Renderer choice remains open:
  - .NET drawing library.
  - Headless browser/canvas.
  - Another deterministic rendering service.

## Phase 8: Card Artwork Editor

This is enabled by `create card` cards and should reuse the shared drawing editor.

### Frontend

- `CardArtworkEditorView.vue`
  - Portrait preset.
  - Same canvas/layer manager/tools.
  - Card form fields beside or above artwork.
  - Riff-from-existing-card flow.

### Data Model

- Proposed cards are whole cards:
  - Rule/prompt
  - Skip number
  - Hint number
  - Palette
  - Action type
  - Artwork document
  - Optional source card ID
- Denied cards remain in the user's card library and can be riffed on or voted on again later.

## Phase 9: Testing and Verification

### Backend Tests

- Palette CRUD validation.
- Card CRUD validation.
- Deck draw ordering and draw-to-bottom behavior.
- Shuffle card behavior.
- Tile assignment by primary key order.
- Linear search skips locked/unavailable tiles.
- Create-tile adjacency validation.
- Lock renewal and expiration.
- Server-side changed-pixel validation.

### Frontend Checks

- Palette editor validation and reorder.
- Card editor validation and palette preview.
- Drawing document render snapshots for basic shapes.
- Transform preservation when moving into/out of groups.
- Undo/redo for shape edits and layer moves.
- Tile editor blocks over-limit saves.
- Autosave timer behavior.

## First Milestone Cut

The first useful milestone should be:

1. Palette CRUD editor.
2. Card CRUD editor without artwork.
3. Basic tile model/browser.
4. Shared drawing editor prototype with layer manager and a few shapes.
5. Manual tile edit session with server persistence of layer-list JSON.

After that, add deck draw, locking, changed-pixel checks, create-tile, and create-card flows.
