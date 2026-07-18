<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CardDetailResponse, TileDetailResponse } from '../api'
import { cardsApi, tilesApi } from '../api'
import DrawingCanvas from './DrawingCanvas.vue'
import type { CanvasViewport } from './DrawingCanvas.vue'
import EditorContextPanel from './EditorContextPanel.vue'
import EditorToolRail from './EditorToolRail.vue'
import LayerManager from './LayerManager.vue'
import LayerStyleControls from './LayerStyleControls.vue'
import { sampleTileDocument } from '../editor/sampleDrawingDocument'
import { useDrawingDocument } from '../editor/useDrawingDocument'

const route = useRoute()
const tile = ref<TileDetailResponse>()
const card = ref<CardDetailResponse>()
const isLoading = ref(false)
const errorMessage = ref('')
const isContextPanelCollapsed = ref(false)
const {
  activeFill,
  activeTool,
  addDraftPoint,
  beginBrush,
  beginCircle,
  beginControlPointDrag,
  beginPointShape,
  beginShapeMove,
  canDeleteSelection,
  canGroupSelection,
  canRedo,
  canUngroupSelection,
  canUndo,
  deleteSelectedNode,
  document: drawingDocument,
  createText,
  finishDraftBrush,
  finishDraftPointShape,
  finishControlPointDrag,
  finishDraftCircle,
  finishShapeMove,
  groupSelectedNode,
  moveNodeTo,
  moveSelectedIntoPreviousGroup,
  moveSelectedOutOfGroup,
  isDraftingPointShape,
  redo,
  renameNode,
  replaceDocument,
  reorderNode,
  selectNode,
  selectedNodeId,
  selectedNode,
  selectedNodeMoveState,
  selectedShape,
  setActiveColor,
  setActiveTool,
  undo,
  updateControlPointDrag,
  updateDraftBrush,
  updateDraftCircle,
  updateDraftPointShape,
  updateSelectedShapeStyle,
  updateSelectedGroupTransform,
  updateSelectedText,
  updateSelectedTextOptions,
  updateShapeMove,
  ungroupSelectedNode,
} = useDrawingDocument(sampleTileDocument)

const tileId = computed(() => Number(route.params.tileId))
const cardId = computed(() => Number(route.params.cardId))
const paletteColors = computed(() => card.value?.palette?.colors ?? [])
const draftStorageKey = computed(() => `pmp.tile-editor-draft.${tileId.value}.${cardId.value}`)
const draftStatus = ref('Draft not saved yet')
const viewport = ref<CanvasViewport>({
  zoom: 1,
  panX: 0,
  panY: 0,
})
const zoomLabel = computed(() => `${Math.round(viewport.value.zoom * 100)}%`)
const scaleGuideWidth = computed(() => `${(100 / sampleTileDocument.width) * 100 * viewport.value.zoom}%`)
let draftSaveTimer: number | undefined

onMounted(() => {
  loadEditorContext()
  window.addEventListener('keydown', handleEditorShortcut)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEditorShortcut)
  if (draftSaveTimer) {
    window.clearTimeout(draftSaveTimer)
  }
})

watch(
  drawingDocument,
  () => {
    scheduleDraftSave()
  },
  { deep: true },
)

async function loadEditorContext() {
  if (!Number.isInteger(tileId.value) || !Number.isInteger(cardId.value)) {
    errorMessage.value = 'The editor route is missing a valid tile or card.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  const [tileResult, cardResult] = await Promise.allSettled([
    tilesApi.tiles_GetTile(tileId.value),
    cardsApi.cards_GetCard(cardId.value),
  ])

  if (tileResult.status === 'fulfilled') {
    tile.value = tileResult.value
  } else {
    errorMessage.value = 'The selected tile could not be loaded.'
  }

  if (cardResult.status === 'fulfilled') {
    card.value = cardResult.value
    syncActiveColorFromCard(cardResult.value)
    loadLocalDraft()
  } else {
    errorMessage.value = errorMessage.value
      ? `${errorMessage.value} The selected card could not be loaded.`
      : 'The selected card could not be loaded.'
  }

  isLoading.value = false
}

function formatCoordinate(nextTile?: { x?: number; y?: number }) {
  return nextTile ? `(${nextTile.x ?? 0}, ${nextTile.y ?? 0})` : ''
}

function toggleContextPanel() {
  isContextPanelCollapsed.value = !isContextPanelCollapsed.value
}

function syncActiveColorFromCard(nextCard: CardDetailResponse) {
  const firstColor = nextCard.palette?.colors?.[0]?.hex
  if (firstColor) {
    setActiveColor(firstColor)
  }
}

function handleEditorShortcut(event: KeyboardEvent) {
  if (isTypingTarget(event.target)) {
    return
  }

  const isModifierPressed = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()

  if (isModifierPressed && key === 'z' && event.shiftKey) {
    event.preventDefault()
    redo()
    return
  }

  if (isModifierPressed && key === 'z') {
    event.preventDefault()
    undo()
    return
  }

  if (isModifierPressed && key === 'y') {
    event.preventDefault()
    redo()
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    deleteSelectedNode()
    return
  }

  if (event.key === 'Enter' && isDraftingPointShape.value) {
    event.preventDefault()
    finishDraftPointShape()
  }
}

function updateViewport(nextViewport: CanvasViewport) {
  viewport.value = {
    zoom: Math.max(0.35, Math.min(3, nextViewport.zoom)),
    panX: nextViewport.panX,
    panY: nextViewport.panY,
  }
}

function zoomCanvas(direction: 1 | -1) {
  updateViewport({
    ...viewport.value,
    zoom: viewport.value.zoom * (direction > 0 ? 1.2 : 0.82),
  })
}

function resetViewport() {
  updateViewport({
    zoom: 1,
    panX: 0,
    panY: 0,
  })
}

function scheduleDraftSave() {
  if (!Number.isInteger(tileId.value) || !Number.isInteger(cardId.value)) {
    return
  }

  if (draftSaveTimer) {
    window.clearTimeout(draftSaveTimer)
  }

  draftStatus.value = 'Saving draft...'
  draftSaveTimer = window.setTimeout(() => {
    localStorage.setItem(draftStorageKey.value, JSON.stringify(drawingDocument.value))
    draftStatus.value = `Draft saved ${new Date().toLocaleTimeString()}`
  }, 250)
}

function loadLocalDraft() {
  const savedDraft = localStorage.getItem(draftStorageKey.value)
  if (!savedDraft) {
    draftStatus.value = 'No saved draft for this tile/card'
    return
  }

  try {
    replaceDocument(JSON.parse(savedDraft))
    draftStatus.value = 'Loaded local draft'
  } catch {
    draftStatus.value = 'Saved draft could not be loaded'
  }
}

function resetLocalDraft() {
  localStorage.removeItem(draftStorageKey.value)
  replaceDocument(sampleTileDocument)
  draftStatus.value = 'Draft reset'
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}
</script>

<template>
  <section
    class="tile-editor-workspace"
    :class="{ 'context-collapsed': isContextPanelCollapsed && tile && card }"
    aria-labelledby="tile-editor-heading"
  >
    <header v-if="!tile || !card" class="workspace-header">
      <div>
        <h1 id="tile-editor-heading">Tile editor</h1>
        <p v-if="tile && card">
          {{ formatCoordinate(tile) }} with {{ card.title }}
        </p>
        <p v-else>Loading editor context.</p>
      </div>
      <RouterLink class="secondary-button route-button" to="/tiles">Back to tiles</RouterLink>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <div v-if="isLoading" class="empty-state panel-empty">Loading editor...</div>

    <div v-else-if="tile && card" class="tile-editor-layout">
      <EditorContextPanel
        :active-fill="activeFill"
        :card="card"
        :is-collapsed="isContextPanelCollapsed"
        :palette-colors="paletteColors"
        :tile="tile"
        @set-active-color="setActiveColor"
        @toggle-collapsed="toggleContextPanel"
      />

      <section class="drawing-editor-shell" aria-label="Drawing editor">
        <EditorToolRail
          :active-tool="activeTool"
          :can-delete-selection="canDeleteSelection"
          :can-redo="canRedo"
          :can-undo="canUndo"
          :has-selection="Boolean(selectedNodeId)"
          :is-drafting-point-shape="isDraftingPointShape"
          :zoom-label="zoomLabel"
          @delete-selection="deleteSelectedNode"
          @finish-draft-point-shape="finishDraftPointShape"
          @redo="redo"
          @reset-zoom="resetViewport"
          @set-active-tool="setActiveTool"
          @undo="undo"
          @zoom-in="zoomCanvas(1)"
          @zoom-out="zoomCanvas(-1)"
        />

        <div class="tile-canvas-stage">
          <DrawingCanvas
            :active-tool="activeTool"
            :document="drawingDocument"
            :is-drafting-point-shape="isDraftingPointShape"
            :selected-node-id="selectedNodeId"
            :viewport="viewport"
            @add-draft-point="addDraftPoint"
            @begin-brush="beginBrush"
            @begin-circle="beginCircle"
            @begin-control-point-drag="beginControlPointDrag"
            @begin-point-shape="beginPointShape"
            @begin-shape-move="beginShapeMove"
            @create-text="createText"
            @finish-brush="finishDraftBrush"
            @finish-draft-point-shape="finishDraftPointShape"
            @finish-control-point-drag="finishControlPointDrag"
            @finish-shape-move="finishShapeMove"
            @update-circle="updateDraftCircle"
            @update-control-point-drag="updateControlPointDrag"
            @update-draft-point-shape="updateDraftPointShape"
            @update-shape-move="updateShapeMove"
            @finish-circle="finishDraftCircle"
            @update-brush="updateDraftBrush"
            @update-viewport="updateViewport"
          />
          <div class="canvas-scale-guide" aria-label="100 foot scale" :style="{ width: scaleGuideWidth }">
            <span>100ft</span>
          </div>
        </div>
      </section>

      <aside class="editor-side-panel">
        <section class="draft-panel" aria-label="Draft">
          <span>{{ draftStatus }}</span>
          <button class="icon-button" type="button" title="Reset local draft" @click="resetLocalDraft">Reset</button>
        </section>
        <LayerStyleControls
          :active-fill="activeFill"
          :palette-colors="paletteColors"
          :selected-node="selectedNode"
          :selected-shape="selectedShape"
          @set-active-color="setActiveColor"
          @update-group-transform="updateSelectedGroupTransform"
          @update-style="updateSelectedShapeStyle"
          @update-text="updateSelectedText"
          @update-text-options="updateSelectedTextOptions"
        />
        <LayerManager
          :can-group-selection="canGroupSelection"
          :can-ungroup-selection="canUngroupSelection"
          :document="drawingDocument"
          :selected-node-id="selectedNodeId"
          :selected-node-move-state="selectedNodeMoveState"
          @group-selection="groupSelectedNode"
          @move-into-previous-group="moveSelectedIntoPreviousGroup"
          @move-node-to="moveNodeTo"
          @move-out-of-group="moveSelectedOutOfGroup"
          @rename="renameNode"
          @reorder="reorderNode"
          @select="selectNode"
          @ungroup-selection="ungroupSelectedNode"
        />
      </aside>
    </div>
  </section>
</template>
