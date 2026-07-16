<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CardDetailResponse, TileDetailResponse } from '../api'
import { cardsApi, tilesApi } from '../api'
import DrawingCanvas from './DrawingCanvas.vue'
import LayerManager from './LayerManager.vue'
import { sampleTileDocument } from '../editor/sampleDrawingDocument'
import { useDrawingDocument } from '../editor/useDrawingDocument'

const route = useRoute()
const tile = ref<TileDetailResponse>()
const card = ref<CardDetailResponse>()
const isLoading = ref(false)
const errorMessage = ref('')
const {
  activeFill,
  activeTool,
  beginCircle,
  beginControlPointDrag,
  canRedo,
  canUndo,
  document: drawingDocument,
  finishControlPointDrag,
  finishDraftCircle,
  redo,
  selectNode,
  selectedNodeId,
  setActiveColor,
  setActiveTool,
  undo,
  updateControlPointDrag,
  updateDraftCircle,
} = useDrawingDocument(sampleTileDocument)

const tileId = computed(() => Number(route.params.tileId))
const cardId = computed(() => Number(route.params.cardId))
const paletteColors = computed(() => card.value?.palette?.colors ?? [])

onMounted(() => {
  loadEditorContext()
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

function syncActiveColorFromCard(nextCard: CardDetailResponse) {
  const firstColor = nextCard.palette?.colors?.[0]?.hex
  if (firstColor) {
    setActiveColor(firstColor)
  }
}
</script>

<template>
  <section class="tile-editor-workspace" aria-labelledby="tile-editor-heading">
    <header class="workspace-header">
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
      <aside class="active-card-panel" aria-label="Active card">
        <div class="card-preview-header">
          <span>{{ card.actionType }}</span>
          <span>Skip {{ card.skipNumber }} / Hint {{ card.hintNumber }}</span>
        </div>
        <h2>{{ card.title }}</h2>
        <p>{{ card.prompt }}</p>
        <div class="palette-strip editor-palette-strip" aria-label="Active palette">
          <button
            v-for="color in paletteColors"
            :key="`${color.id}-${color.hex}`"
            class="palette-color-button"
            :class="{ selected: color.hex === activeFill }"
            type="button"
            :style="{ background: color.hex }"
            :title="`${color.name}: ${color.hex}`"
            @click="color.hex && setActiveColor(color.hex)"
          ></button>
        </div>
      </aside>

      <section class="drawing-editor-shell" aria-label="Drawing editor">
        <div class="tool-rail" aria-label="Editor tools">
          <button
            class="tool-button"
            :class="{ active: activeTool === 'edit' }"
            type="button"
            title="Edit selected control points"
            :disabled="!selectedNodeId"
            @click="setActiveTool('edit')"
          >
            E
          </button>
          <button class="tool-button" type="button" title="Brush" disabled>B</button>
          <button class="tool-button" type="button" title="Polyline" disabled>L</button>
          <button
            class="tool-button"
            :class="{ active: activeTool === 'circle' }"
            type="button"
            title="Circle"
            @click="setActiveTool('circle')"
          >
            C
          </button>
          <button class="tool-button" type="button" title="Polygon" disabled>P</button>
          <button class="tool-button tool-divider" type="button" title="Undo" :disabled="!canUndo" @click="undo">
            U
          </button>
          <button class="tool-button" type="button" title="Redo" :disabled="!canRedo" @click="redo">
            R
          </button>
        </div>

        <div class="tile-canvas-stage">
          <DrawingCanvas
            :active-tool="activeTool"
            :document="drawingDocument"
            :selected-node-id="selectedNodeId"
            @begin-circle="beginCircle"
            @begin-control-point-drag="beginControlPointDrag"
            @finish-control-point-drag="finishControlPointDrag"
            @update-circle="updateDraftCircle"
            @update-control-point-drag="updateControlPointDrag"
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
