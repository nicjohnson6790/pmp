# Feature TODO: Palettes, Cards, and Tiles

This is the working plan for the first three major product features. The goal is to build the domain in an order that lets each feature stand on its own while preserving the core loop: a card gives the mapper a prompt, the card limits the available palette, and the mapper edits a tile using those constraints.

## Product Shape

- Palettes define named color sets that can be reused by cards.
- Cards provide an editing prompt/rule, reference one palette, include a tile skip number from `1` to `9`, and include a hint number from `1` to `9`.
- Tiles are claimable/editable map surfaces whose editor is constrained by the active card and its palette.
- New tiles are created by drawing a `create tile` card, then choosing a location adjacent to an existing tile.
- The site has one global map, one global deck, and one global active tile cursor shared by all users.
- Tile traversal is based on the primary key order of the tiles table.
- When a user asks for a card, the next global deck card is drawn and its skip number advances from the active tile cursor to determine which open tile the user edits next.
- A map edit should be traceable to the card, palette, skip number, hint number, tile cursor state, and user context used at the time of editing.

## Cross-Cutting Decisions

- Decide whether IDs should be sequential integers, GUIDs, or public slugs before exposing URLs.
- Keep server DTOs separate from EF entities once the domain starts growing.
- Generate the TypeScript API client through the existing NSwag path after API changes.
- Favor simple authenticated CRUD first, then add collaboration and publishing rules.
- Prefer storing editor content as structured JSON for early iterations, with a clear path to richer validation later.
- Track ownership and timestamps on all three feature areas.
- Treat the tile editor and card artwork editor as two uses of the same drawing system, with different canvas presets and surrounding UI.

## Main Editing Loop

1. A signed-in user asks the site for a card.
2. The site draws the next card from the one global deck.
3. The card has:
   - A tile skip number from `1` to `9`.
   - A hint number from `1` to `9`.
   - A prompt such as `Add houses`.
   - A palette that limits which colors are available during the edit.
4. For normal edit cards, the card is immediately moved to the bottom of the global deck.
5. The site uses the skip number to advance from the current active tile through tile primary key order.
6. The site searches linearly for the next open tile when a skipped-to tile is locked or otherwise unavailable.
7. The site updates the active tile cursor to reflect the newly assigned tile.
8. The assigned tile is locked for that user while they edit.
9. The lock starts at a configurable duration, initially `36` hours, and is renewed on save.
10. The user edits the assigned tile according to the card prompt. The hint number is available for the card to interpret however it wants, including ignoring it.
11. The user is not required to strictly obey the card. The first real enforcement target is an edit-size limit measured by changed rendered pixels, likely around `30%`.
12. The edit is saved as a tile revision/edit session tied to the card, palette, assigned tile, skip number, hint number, and user.
13. If the edit expires unfinished, the last saved draft becomes the current tile version.
14. The most recent tile image is persisted for fast display. Historical edits store recomposable layer-list documents and can be rendered later by a future history viewer.

### Special Card Actions

- `shuffle deck`: shuffles the global deck and stops. If the user still wants an edit card, they can request another card.
- `create tile`: lets the user place a new tile in an open 4-way adjacent location next to an existing tile, then edit up to the configured changed-pixel limit using the card palette if it has one. The map can have holes; new tile placement only needs 4-way adjacency. Create-tile cards do not move the global active tile cursor.
- `create card`: opens a full card editor that reuses the same drawing system as the tile editor, likely in portrait orientation. The user can create or riff on an existing card, changing the rule, numbers, palette, and artwork. New cards go into the future vote pool rather than directly into the global deck.

### Main Loop TODO

- Add a persistent global active tile cursor or map state record.
- Traverse tiles by primary key order.
- Add a card draw/request endpoint that atomically:
  - Draws the next card from the global deck.
  - Applies shuffle-card behavior when the drawn card requires it.
  - Moves normal drawn cards to the bottom of the global deck immediately, without waiting for the user edit to complete.
  - Reads the current active tile.
  - Advances by the card skip number using tile primary key order.
  - Searches linearly for the next open tile when the target tile is unavailable.
  - Assigns and locks the destination tile to the user.
  - Updates the active tile cursor.
  - Creates an edit session.
- Add edit-session expiration so locked tiles are automatically released.
- Make edit-session lock duration configurable, with an initial default of `36` hours.
- Renew the edit-session lock on save.
- When an unfinished edit expires, make the last saved draft the current tile version.
- Preserve the expired unfinished edit in tile history.
- Store the card prompt and numbers on the edit session so later card edits do not rewrite history.
- Show the active card, skip number, hint number, and assigned tile in the tile editor.
- Prevent saving an edit to a different tile than the assigned tile for that session.
- Add a configurable edit-size limit, initially expected to be around `30%`.
- Measure the edit-size limit by changed rendered pixels.
- Compare changed pixels against the tile image from the start of the edit session, not against the latest draft.
- Treat unchanged white background pixels the same as any other unchanged pixels.
- For changed-pixel detection, compare RGB values directly.
- Show the starting tile image as the bottom visual layer in the editor.
- Check the changed-pixel limit while editing and block saves that exceed the limit.
- The client sends only the layer-list document to the server.
- The server renders the updated tile image from the layer-list document and performs the authoritative final changed-pixel check before accepting a save.
- Keep server-side rendering technology as an implementation decision to evaluate later.
- Autosave every `5` minutes and support manual save.
- Persist only the newest tile image as an image artifact.
- Persist historical tile revisions as structured layer-list documents.
- Add a future history viewer that rebuilds images from saved layer-list revisions.

## Shared Drawing Editor Model

The map tile editor should be a structured canvas editor, not a simple raster paint surface. The canvas renders the current drawing document, while the layer manager owns the ordered layer tree, selection state, document mutations, and undo/redo history.

### Document Structure

- Store a drawing document as a tree of layer nodes.
- Support two node types:
  - `group`: contains child nodes and stores a transform.
  - `shape`: stores geometry, style, and its own transform if needed.
- Supported first-pass shape geometry:
  - `circle`: center/radius or equivalent editable control points.
  - `polyline`: ordered control points with stroke styling.
  - `polygon`: ordered control points with fill/stroke styling.
  - `brush`: continuously sampled polyline with stroke styling.
- Shared shape style:
  - Fill color.
  - Stroke color.
  - Stroke width.
  - Optional hidden/locked flags later.
- Store transforms at group level for grouped move/rotate/resize operations.
- Preserve visual world position when moving nodes into or out of groups:
  - When a node leaves a group, bake the parent/group transform into the child.
  - When a node enters a group, apply the inverse group transform to the child.
  - The item should not jump, resize, or rotate because its parent changed.

### Canvas Component

- Render the layer tree from bottom to top.
- Draw group and shape transforms in document order.
- Highlight selected item control points.
- Allow dragging existing control points.
- Allow adding control points where the selected shape type supports it.
- Support group-level transform handles for move, rotate, and resize when a group is selected.
- Pass canvas interaction events to the layer manager instead of directly mutating document state.
- Ask the layer manager for:
  - The current flattened render order.
  - The active selection.
  - The editable control points for the selected item.
  - The active tool and palette-constrained style settings.

### Layer Manager Component

- Own the canonical drawing document state.
- Display a nested, reorderable tree of groups and shapes.
- Allow drag/drop reordering within the tree.
- Allow dragging items into and out of groups.
- Select items from the list and notify the canvas.
- Update items in response to canvas events.
- Maintain undo/redo history for document edits:
  - Create/delete item.
  - Reorder item.
  - Group/ungroup.
  - Move item into or out of group.
  - Change control points.
  - Change fill/stroke/stroke width.
  - Apply group transform.
- Expose a small editing API to the canvas rather than letting the canvas reach into internal state freely.

### Component Boundary

- Use a parent editor view to compose the canvas, layer manager, active card panel, palette controls, and tool controls.
- Keep the drawing document in one authoritative store/composable owned by the editor view or layer manager.
- The canvas should be responsible for pointer math and rendering.
- The layer manager/editor store should be responsible for mutations, history, selection, and serialization.
- Redraw after every committed document change by rendering the ordered tree from bottom to top.

### Reuse for Cards

- The card editor can reuse the same canvas/layer-manager system for card artwork.
- Card artwork should likely use a portrait canvas preset, while map tiles likely use the landscape tile preset.
- Card artwork does not need tile claiming or adjacent tile context, but it should share shape tools, grouping, control-point editing, transforms, serialization, and undo/redo.

## 1. Palettes

### Backend

- Add a `Palette` entity with owner, name, description, created/updated timestamps, and active/archived state.
- Add a `PaletteColor` value/entity model with name, hex color, sort order, and optional usage notes.
- Add EF configuration and migration for palette tables.
- Add API endpoints:
  - `GET /api/palettes`
  - `GET /api/palettes/{id}`
  - `POST /api/palettes`
  - `PUT /api/palettes/{id}`
  - `DELETE` or archive endpoint for palettes not yet used by cards
- Add validation:
  - Palette name is required.
  - Palette must contain at least one color.
  - Colors must be valid hex values.
  - Color names should be unique within a palette.
- Decide whether a palette used by cards can be edited in place or should create a revision.

### Frontend

- Add a palettes route/view inside the authenticated shell.
- Build a palette list with create/edit/archive actions.
- Build a palette editor with:
  - Name and description fields.
  - Add/remove/reorder colors.
  - Hex input plus visual swatch.
  - Color name/label.
  - Preview strip showing the final palette order.
- Add client-side validation that mirrors server rules.
- Use generated API client types rather than handwritten request shapes.

### Open Questions

- Should palettes be personal only at first, or visible to all mappers?
- Should palette colors have semantic roles like `water`, `road`, `border`, `building`, or stay freeform?
- Should cards lock to a palette revision so later palette edits do not alter old card behavior?

## 2. Cards

### Backend

- Add a `Card` entity with owner, title, prompt/hint text, palette reference, sort/category fields, and active/archived state.
- Add optional fields for future card mechanics:
  - Difficulty or complexity.
  - Category such as build, alter, connect, divide, rename, recolor.
  - Rule JSON for later machine-readable constraints.
- Add required card-loop fields:
  - Skip number from `1` to `9`.
  - Hint number from `1` to `9`, interpreted by the card text/rule and allowed to be ignored.
  - Deck order.
  - Card action/type, such as normal edit, shuffle deck, create tile, or create card.
- Add EF configuration and migration for card tables.
- Add API endpoints:
  - `GET /api/cards`
  - `GET /api/cards/{id}`
  - `POST /api/cards`
  - `PUT /api/cards/{id}`
  - `DELETE` or archive endpoint
- Add validation:
  - Title is required.
  - Prompt/hint is required.
  - Palette reference must exist and be readable by the current user.
  - Skip number must be between `1` and `9`.
  - Hint number must be between `1` and `9`.
- Add a card draw/request endpoint as part of the main editing loop.
- Add deck ordering/shuffling support for the global deck.
- Treat user-created cards and deck governance as future features, not first-pass requirements.
- Shuffle cards should shuffle the global deck and then stop. If the user still wants an edit card, they can request another card.
- Normal drawn cards should move to the bottom of the deck immediately.
- Create-card cards should launch card creation and send the created card to the future vote pool.
- Denied proposed cards remain available in the creator's card library and can be voted on again or riffed on later.

### Frontend

- Add a cards route/view inside the authenticated shell.
- Build a card list with title, prompt excerpt, palette preview, and status.
- Build a card editor with:
  - Title.
  - Prompt/hint text.
  - Skip number selector from `1` to `9`.
  - Hint number selector from `1` to `9`.
  - Card action/type selector.
  - Palette picker with swatch preview.
  - Future palette explorer modal instead of the simple select box:
    - Show the user's favorited palettes first.
    - Search palettes by creator/user and palette name.
    - Show palette swatches and enough metadata to choose confidently.
  - Optional category/difficulty fields if the backend includes them.
- Show how the card will appear in the tile editor.
- Prevent saving a card without an available palette.
- Reuse the shared drawing editor for optional card artwork, using a portrait canvas preset.
- Keep card artwork document storage compatible with tile drawing document storage.

### Open Questions

- Should cards be versioned separately from palettes?
- How strict should the app be about enforcing card instructions versus treating them as human prompts?
- Should shuffle cards have their own palette/artwork, or are they system-only cards?
- What metadata should proposed cards in the vote pool store beyond title, prompt, numbers, palette, artwork, and source card?

## 3. Tiles

### Backend

- Add a `Tile` entity with map coordinates, owner/claimer, status, created/updated timestamps, and current content reference.
- Decide canonical orientation:
  - Portrait: `1000 x 1414`
  - Landscape: `1414 x 1000`
- Add constants for canonical tile dimensions and scale:
  - `1 pixel = 1 foot`
  - Tile dimensions stored in pixels.
- Add a `TileRevision` or `TileEditSession` entity to capture:
  - Tile ID.
  - Card ID used.
  - Palette ID or palette revision used.
  - Skip number used.
  - Hint number used.
  - Active tile cursor before and after assignment.
  - Structured drawing document payload.
  - Whether the edit was completed or expired.
  - Optional rendered preview path/blob metadata for the newest tile image.
- Add a global map state record to track the current active tile cursor.
- Add tile lock fields for active edit sessions:
  - Locked by user.
  - Lock expiration time.
  - Active edit session.
- Add configurable map/editor settings:
  - Edit lock duration, default `36` hours.
  - Lock renewal behavior on save.
  - Changed-pixel edit-size limit, initially around `30%`.
  - Autosave interval, default `5` minutes.
- Add API endpoints:
  - `GET /api/tiles`
  - `GET /api/tiles/{id}`
  - `POST /api/tiles/claim`
  - `PUT /api/tiles/{id}/content`
  - `POST /api/tiles/{id}/revisions`
  - `POST /api/edit-sessions/request-card`
  - `POST /api/edit-sessions/{id}/place-new-tile`
  - `POST /api/edit-sessions/{id}/save-draft`
  - `POST /api/edit-sessions/{id}/complete`
- Add coordinate validation so adjacent tiles can line up on a shared grid.
- Use simple integer grid coordinates, with the first tile at `(0, 0)`.
- Add adjacency validation for create-tile placement.
- Create-tile placement uses 4-way adjacency only.
- The map may contain holes; placement does not need to fill gaps or maintain a solid rectangle.
- Create-tile sessions do not update the global active tile cursor.
- Add ownership/permission rules for claiming and editing.
- Add expiration handling for abandoned edit sessions.
- On expiration, promote the last saved draft to the current tile version and release the tile lock.

### Frontend

- Add a tile map/browser route.
- Show claimed and unclaimed grid coordinates.
- For create-tile sessions, let the user choose an open 4-way adjacent location next to an existing tile.
- Add a tile detail/editor route.
- Build the first editor shell:
  - Canvas sized to the canonical tile ratio.
  - Starting tile image shown as the bottom visual layer or locked background layer.
  - Active card panel.
  - Skip number and hint number display.
  - Assigned tile coordinate display.
  - Palette-limited swatches.
  - Tool rail placeholder for select, group transform, brush, polyline, circle, polygon/region, eyedropper, pan/zoom, undo/redo.
  - Layer manager with nested groups, drag/drop reordering, and selection.
  - Save draft action.
- Start with a minimal structured drawing payload, even if only a subset of drawing tools works at first.
- Ensure the editor never offers colors outside the active card palette.
- Store fill/stroke choices from the active card palette on each shape.
- Copy palette colors into tile/card artwork shapes when they are used; do not store tile colors as live references to palettes.
- Track changed-pixel count while editing and block save when the configured limit is exceeded.
- For new tiles, compare against a blank white starting tile.
- Send only the structured layer-list document to the server on save/complete.
- Autosave every `5` minutes and provide a manual save action.
- Highlight and edit control points for selected shapes.
- Support group move/rotate/resize with transforms stored on the group.
- Preserve visual position/scale/rotation when moving items into or out of groups.
- Keep all document mutations undo/redoable through the layer manager/editor store.

### Open Questions

- What is the exact JSON schema for the first drawing document?
- Should neighboring tile edges be visible while editing for continuity?
- What server-side renderer should generate the newest tile image from the layer-list document?
- Should Bezier curves be part of the first drawing shape set, or should they wait until after circle/polyline/polygon/brush are solid?
- How should freehand brush sampling be simplified so documents do not become too large?
- Should the starting tile image appear in the layer manager as a locked background layer, or only render beneath editable layers?

## Future Governance

- Users should eventually be able to propose new cards and decks.
- `create card` cards create proposed cards for the vote pool.
- A user can pick an existing card, including a denied card from their card library, to riff on when creating a proposed card.
- A proposed card is created as a whole card: rule text, skip number, hint number, palette, action/type, and artwork.
- Denied proposed cards remain discoverable in the user's card library and can be voted on again or used as the basis for a new riff.
- Proposed cards/decks go through an upvote process.
- Once per week, the highest-voted new cards enter a final voting process to decide which cards join the global deck.
- Existing cards can receive review votes and may be up for removal during the weekly vote.
- Palette removal is not part of this removal process.
- Palette changes also require voting.
- Palette discovery should support favoriting palettes and searching public/shared palettes by creator/user and palette name so card authors are not limited to a local select box.
- This governance system is out of scope for the first pass, but the card model should avoid choices that make voting/review difficult later.

## Suggested Build Order

1. Add shared domain conventions: ownership, timestamps, archive flags, DTO patterns, and route conventions.
2. Build palette CRUD end to end.
3. Build card CRUD end to end, with required palette selection plus skip/hint numbers.
4. Build tile model, global map state cursor, edit-session locks, and basic grid/claiming API.
5. Build tile browser UI.
6. Define the shared drawing document schema and editor store.
7. Build the canvas renderer for grouped shape documents.
8. Build the nested layer manager with selection, drag/drop reordering, and undo/redo.
9. Build the global deck draw endpoint, including draw-to-bottom behavior and shuffle cards that shuffle and stop.
10. Build the card request/edit-session endpoint that advances the active tile cursor by tile primary key order, skips unavailable tiles, and locks the assigned tile.
11. Add create-tile sessions with adjacent placement and initial edit support.
12. Build tile editor shell that displays the selected card, skip number, hint number, assigned tile, and restricts colors to the card palette.
13. Add client-side live changed-pixel checks that compare RGB values and block save when the edit exceeds the configured limit.
14. Add server-side rendering from layer-list documents plus authoritative changed-pixel validation.
15. Add manual save, `5` minute autosave, completion, configurable expiration, expiration-as-current behavior, and latest-image persistence.
16. Add card-linked tile revisions/edit sessions.
17. Reuse the drawing editor for create-card cards and proposed card artwork.
18. Iterate editor tools, latest-image generation, and future history rendering.

## Definition of Done for the First Pass

- A signed-in user can create a palette.
- A signed-in user can create a card tied to that palette.
- A signed-in user can request a card and receive an assigned tile based on the card skip number.
- Normal drawn cards move to the bottom of the global deck immediately.
- Shuffle cards shuffle the global deck and stop.
- The active tile cursor is updated when a card/tile assignment is made.
- Tile assignment uses tile primary key order and linearly searches for the next open tile.
- The assigned tile is locked while the user edits and released when the edit completes or expires.
- Edit locks default to `36` hours, renew on save, and are configurable.
- Expired unfinished edits promote the last saved draft to the current tile version and preserve that layer-list revision in tile history.
- The tile editor shows the active card prompt, skip number, hint number, and assigned tile.
- The tile editor only exposes colors from the card palette.
- Palette colors are copied onto shapes rather than referenced live from tiles/card artwork.
- Create-tile cards allow a user to place a new tile adjacent to an existing tile.
- Create-tile placement uses open 4-way adjacency, the map is allowed to have holes, and create-tile cards do not move the global active tile cursor.
- The first-pass edit-size limit is configurable, expected to be around `30%`, and measured by changed rendered pixels against the tile image at the start of the edit session.
- Changed-pixel detection compares RGB values directly.
- New tile edits compare against a blank white starting tile.
- The editor shows the starting tile image as the bottom visual layer or locked background layer.
- Saves are blocked when the live changed-pixel count exceeds the configured limit.
- The client sends layer-list documents to the server; the server renders the newest tile image and performs the authoritative changed-pixel check.
- The tile editor can create and render circle, polyline, polygon, and brush shapes.
- The tile editor can select shapes from the canvas or layer manager and edit their control points.
- The layer manager can nest groups and reorder items with drag/drop.
- Moving items into or out of groups preserves their visual position, size, and rotation.
- Group transforms are stored at the group level.
- Drawing document edits support undo/redo.
- A draft tile edit autosaves every `5` minutes, can be saved manually, and can be reopened.
- The newest completed tile version has a persisted rendered image.
- Historical tile versions are stored as recomposable layer-list documents.
- Create-card cards open a full card editor and save whole proposed cards to the future vote pool.
- Server and client builds pass.
