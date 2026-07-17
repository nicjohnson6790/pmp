<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { CardDetailResponse, PaletteColorResponse, TileDetailResponse } from '../api'

defineProps<{
  activeFill: string
  card: CardDetailResponse
  isCollapsed: boolean
  paletteColors: PaletteColorResponse[]
  tile: TileDetailResponse
}>()

const emit = defineEmits<{
  setActiveColor: [hex: string]
  toggleCollapsed: []
}>()

function formatCoordinate(nextTile: { x?: number; y?: number }) {
  return `(${nextTile.x ?? 0}, ${nextTile.y ?? 0})`
}
</script>

<template>
  <aside class="editor-context-panel" aria-label="Editor context">
    <button
      class="tool-button context-toggle"
      type="button"
      :title="isCollapsed ? 'Show editor context' : 'Hide editor context'"
      @click="emit('toggleCollapsed')"
    >
      {{ isCollapsed ? '>' : '<' }}
    </button>

    <div v-if="!isCollapsed" class="editor-context-content">
      <header class="editor-context-header">
        <div>
          <h1 id="tile-editor-heading">Tile editor</h1>
          <p>{{ formatCoordinate(tile) }} with {{ card.title }}</p>
        </div>
        <RouterLink class="secondary-button route-button" to="/tiles">Back to tiles</RouterLink>
      </header>

      <section class="active-card-panel" aria-label="Active card">
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
            @click="color.hex && emit('setActiveColor', color.hex)"
          ></button>
        </div>
      </section>
    </div>
  </aside>
</template>
