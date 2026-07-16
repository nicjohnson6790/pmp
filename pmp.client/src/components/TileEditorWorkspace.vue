<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CardDetailResponse, TileDetailResponse } from '../api'
import { cardsApi, tilesApi } from '../api'

const route = useRoute()
const tile = ref<TileDetailResponse>()
const card = ref<CardDetailResponse>()
const isLoading = ref(false)
const errorMessage = ref('')

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
          <span
            v-for="color in paletteColors"
            :key="`${color.id}-${color.hex}`"
            :style="{ background: color.hex }"
            :title="`${color.name}: ${color.hex}`"
          ></span>
        </div>
      </aside>

      <section class="drawing-editor-shell" aria-label="Drawing editor">
        <div class="tool-rail" aria-label="Editor tools">
          <button class="tool-button active" type="button" title="Brush">B</button>
          <button class="tool-button" type="button" title="Polyline">L</button>
          <button class="tool-button" type="button" title="Circle">C</button>
          <button class="tool-button" type="button" title="Polygon">P</button>
        </div>

        <div class="tile-canvas-stage">
          <div class="tile-canvas-placeholder">
            <span>{{ formatCoordinate(tile) }}</span>
          </div>
        </div>

        <aside class="layer-manager-panel" aria-label="Layers">
          <h2>Layers</h2>
          <div class="empty-state">No drawing layers yet.</div>
        </aside>
      </section>
    </div>
  </section>
</template>
