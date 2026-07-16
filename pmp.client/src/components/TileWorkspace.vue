<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { TileCreateRequest, TileDetailResponse, TileSummaryResponse } from '../api'
import { tilesApi } from '../api'

type TileForm = {
  x: number
  y: number
}

const tiles = ref<TileSummaryResponse[]>([])
const selectedTile = ref<TileDetailResponse>()
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const form = reactive<TileForm>({ x: 0, y: 0 })

const sortedTiles = computed(() => {
  return [...tiles.value].sort((left, right) => left.y! - right.y! || left.x! - right.x!)
})

const bounds = computed(() => {
  if (tiles.value.length === 0) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1 }
  }

  const xValues = tiles.value.map((tile) => tile.x ?? 0)
  const yValues = tiles.value.map((tile) => tile.y ?? 0)
  return {
    minX: Math.min(...xValues) - 1,
    maxX: Math.max(...xValues) + 1,
    minY: Math.min(...yValues) - 1,
    maxY: Math.max(...yValues) + 1,
  }
})

const gridRows = computed(() => {
  const rows: { y: number; cells: { x: number; tile?: TileSummaryResponse }[] }[] = []
  const byCoordinate = new Map(tiles.value.map((tile) => [`${tile.x},${tile.y}`, tile]))

  for (let y = bounds.value.minY; y <= bounds.value.maxY; y += 1) {
    const cells = []
    for (let x = bounds.value.minX; x <= bounds.value.maxX; x += 1) {
      cells.push({ x, tile: byCoordinate.get(`${x},${y}`) })
    }
    rows.push({ y, cells })
  }

  return rows
})

const tileCountLabel = computed(() => {
  return `${tiles.value.length} ${tiles.value.length === 1 ? 'tile' : 'tiles'}`
})

onMounted(() => {
  loadTiles()
})

async function loadTiles() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    tiles.value = await tilesApi.tiles_GetTiles()
  } catch {
    errorMessage.value = 'Tiles could not be loaded.'
  } finally {
    isLoading.value = false
  }
}

async function selectTile(id: number) {
  errorMessage.value = ''

  try {
    selectedTile.value = await tilesApi.tiles_GetTile(id)
  } catch {
    errorMessage.value = 'That tile could not be opened.'
  }
}

function setFormCoordinate(x: number, y: number) {
  form.x = x
  form.y = y
}

async function createTile() {
  isSaving.value = true
  errorMessage.value = ''

  try {
    const saved = await tilesApi.tiles_CreateTile(new TileCreateRequest({ x: form.x, y: form.y }))
    selectedTile.value = saved
    await loadTiles()
  } catch {
    errorMessage.value = 'The tile could not be created. Check whether that coordinate is already occupied.'
  } finally {
    isSaving.value = false
  }
}

async function archiveSelectedTile() {
  if (!selectedTile.value?.id) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    await tilesApi.tiles_ArchiveTile(selectedTile.value.id)
    selectedTile.value = undefined
    await loadTiles()
  } catch {
    errorMessage.value = 'The tile could not be archived.'
  } finally {
    isSaving.value = false
  }
}

function formatCoordinate(tile?: { x?: number; y?: number }) {
  return tile ? `(${tile.x ?? 0}, ${tile.y ?? 0})` : ''
}

function statusLabel(tile: TileSummaryResponse | TileDetailResponse) {
  return tile.isLocked ? 'Locked' : tile.status === 'open' ? 'Open' : tile.status
}
</script>

<template>
  <section class="tile-workspace" aria-labelledby="tile-heading">
    <header class="workspace-header">
      <div>
        <h1 id="tile-heading">Tiles</h1>
        <p>Browse the shared map grid and seed the first editable surfaces.</p>
      </div>
      <span class="workspace-count">{{ tileCountLabel }}</span>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

    <div class="tile-layout">
      <section class="tile-map-panel" aria-label="Tile grid">
        <div class="tile-map-header">
          <h2>Map grid</h2>
          <button class="secondary-button" type="button" :disabled="isLoading" @click="loadTiles">Refresh</button>
        </div>

        <div v-if="isLoading" class="empty-state">Loading tiles...</div>
        <div v-else class="tile-grid" role="grid" aria-label="Known tile coordinates">
          <div v-for="row in gridRows" :key="row.y" class="tile-grid-row" role="row">
            <button
              v-for="cell in row.cells"
              :key="`${cell.x},${row.y}`"
              class="tile-cell"
              :class="{ occupied: !!cell.tile, selected: cell.tile?.id === selectedTile?.id, locked: cell.tile?.isLocked }"
              type="button"
              role="gridcell"
              :aria-label="cell.tile ? `Open tile ${formatCoordinate(cell.tile)}` : `Empty coordinate (${cell.x}, ${row.y})`"
              @click="cell.tile?.id ? selectTile(cell.tile.id) : setFormCoordinate(cell.x, row.y)"
            >
              <span>{{ cell.x }},{{ row.y }}</span>
            </button>
          </div>
        </div>
      </section>

      <aside class="tile-side-panel">
        <form class="tile-create-panel" @submit.prevent="createTile">
          <div class="editor-panel-header">
            <h2>Create tile</h2>
            <button class="primary-button compact" type="submit" :disabled="isSaving">
              {{ isSaving ? 'Saving' : 'Add' }}
            </button>
          </div>

          <div class="tile-coordinate-form">
            <label>
              <span>X</span>
              <input v-model.number="form.x" name="tile-x" type="number" required />
            </label>
            <label>
              <span>Y</span>
              <input v-model.number="form.y" name="tile-y" type="number" required />
            </label>
          </div>
        </form>

        <section class="tile-detail-panel" aria-label="Selected tile">
          <div class="editor-panel-header">
            <h2>Tile detail</h2>
            <button
              v-if="selectedTile"
              class="danger-button"
              type="button"
              :disabled="isSaving"
              @click="archiveSelectedTile"
            >
              Archive
            </button>
          </div>

          <div v-if="!selectedTile" class="empty-state">Select a tile to inspect it.</div>
          <dl v-else class="tile-detail-list">
            <div>
              <dt>Coordinate</dt>
              <dd>{{ formatCoordinate(selectedTile) }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ statusLabel(selectedTile) }}</dd>
            </div>
            <div>
              <dt>Current revision</dt>
              <dd>{{ selectedTile.currentRevisionId ?? 'None' }}</dd>
            </div>
            <div>
              <dt>Image</dt>
              <dd>{{ selectedTile.currentImagePath ?? 'No image yet' }}</dd>
            </div>
          </dl>
        </section>

        <section class="tile-list-panel" aria-label="Tile list">
          <h2>Known tiles</h2>
          <div v-if="sortedTiles.length === 0" class="empty-state">No tiles yet.</div>
          <button
            v-for="tile in sortedTiles"
            v-else
            :key="tile.id"
            class="tile-list-item"
            :class="{ selected: tile.id === selectedTile?.id }"
            type="button"
            @click="selectTile(tile.id!)"
          >
            <span>{{ formatCoordinate(tile) }}</span>
            <span>{{ statusLabel(tile) }}</span>
          </button>
        </section>
      </aside>
    </div>
  </section>
</template>
