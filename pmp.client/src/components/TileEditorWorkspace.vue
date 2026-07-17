<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CardDetailResponse, TileDetailResponse } from '../api'
import { cardsApi, tilesApi } from '../api'
import DrawingCanvas from './DrawingCanvas.vue'
import EditorContextPanel from './EditorContextPanel.vue'
import EditorToolRail from './EditorToolRail.vue'
import LayerManager from './LayerManager.vue'
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
  beginCircle,
  beginControlPointDrag,
  beginPointShape,
  beginShapeMove,
  canDeleteSelection,
  canRedo,
  canUndo,
  deleteSelectedNode,
  document: drawingDocument,
  finishDraftPointShape,
  finishControlPointDrag,
  finishDraftCircle,
  finishShapeMove,
  isDraftingPointShape,
  redo,
  selectNode,
  selectedNodeId,
  setActiveColor,
  setActiveTool,
  undo,
  updateControlPointDrag,
  updateDraftCircle,
  updateDraftPointShape,
  updateShapeMove,
} = useDrawingDocument(sampleTileDocument)

const tileId = computed(() => Number(route.params.tileId))
const cardId = computed(() => Number(route.params.cardId))
const paletteColors = computed(() => card.value?.palette?.colors ?? [])

onMounted(() => {
  loadEditorContext()
  window.addEventListener('keydown', handleEditorShortcut)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEditorShortcut)
})

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
          @delete-selection="deleteSelectedNode"
          @finish-draft-point-shape="finishDraftPointShape"
          @redo="redo"
          @set-active-tool="setActiveTool"
          @undo="undo"
        />

        <div class="tile-canvas-stage">
          <DrawingCanvas
            :active-tool="activeTool"
            :document="drawingDocument"
            :is-drafting-point-shape="isDraftingPointShape"
            :selected-node-id="selectedNodeId"
            @add-draft-point="addDraftPoint"
            @begin-circle="beginCircle"
            @begin-control-point-drag="beginControlPointDrag"
            @begin-point-shape="beginPointShape"
            @begin-shape-move="beginShapeMove"
            @finish-draft-point-shape="finishDraftPointShape"
            @finish-control-point-drag="finishControlPointDrag"
            @finish-shape-move="finishShapeMove"
            @update-circle="updateDraftCircle"
            @update-control-point-drag="updateControlPointDrag"
            @update-draft-point-shape="updateDraftPointShape"
            @update-shape-move="updateShapeMove"
            @finish-circle="finishDraftCircle"
          />
        </div>

        <LayerManager
          :document="drawingDocument"
          :selected-node-id="selectedNodeId"
          @select="selectNode"
        />
      </section>
    </div>
  </section>
</template>
