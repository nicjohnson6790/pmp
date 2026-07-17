<script setup lang="ts">
import { computed } from 'vue'
import type { PaletteColorResponse } from '../api'
import type { DrawingStyle, ShapeNode } from '../editor/drawingTypes'

const props = defineProps<{
  activeFill: string
  paletteColors: PaletteColorResponse[]
  selectedShape?: ShapeNode
}>()

const emit = defineEmits<{
  setActiveColor: [hex: string]
  updateStyle: [style: Partial<DrawingStyle>]
  updateText: [text: string]
}>()

const canFill = computed(() => {
  return props.selectedShape
    ? ['circle', 'polygon', 'text'].includes(props.selectedShape.shapeType)
    : false
})

const canStroke = computed(() => {
  return props.selectedShape ? props.selectedShape.shapeType !== 'text' || Boolean(props.selectedShape.style.stroke) : false
})

function updateStrokeWidth(event: Event) {
  const input = event.target as HTMLInputElement
  emit('updateStyle', { strokeWidth: Number(input.value) })
}

function updateText(event: Event) {
  const input = event.target as HTMLInputElement
  emit('updateText', input.value)
}
</script>

<template>
  <section class="layer-style-panel" aria-label="Layer style">
    <h2>Style</h2>
    <div v-if="!selectedShape" class="empty-state compact">Select a layer.</div>
    <template v-else>
      <label v-if="selectedShape.shapeType === 'text'">
        Text
        <input :value="selectedShape.text" type="text" @change="updateText" />
      </label>

      <label>
        Stroke width
        <input
          :value="selectedShape.style.strokeWidth"
          max="120"
          min="1"
          step="1"
          type="number"
          @change="updateStrokeWidth"
        />
      </label>

      <div class="style-swatch-group" aria-label="Fill color">
        <span>Fill</span>
        <button
          v-for="color in paletteColors"
          :key="`fill-${color.id}-${color.hex}`"
          class="style-swatch-button"
          :class="{ selected: selectedShape.style.fill === color.hex }"
          type="button"
          :disabled="!canFill"
          :style="{ background: color.hex }"
          :title="`Fill ${color.name}: ${color.hex}`"
          @click="color.hex && (emit('setActiveColor', color.hex), emit('updateStyle', { fill: color.hex }))"
        ></button>
      </div>

      <div class="style-swatch-group" aria-label="Stroke color">
        <span>Stroke</span>
        <button
          v-for="color in paletteColors"
          :key="`stroke-${color.id}-${color.hex}`"
          class="style-swatch-button"
          :class="{ selected: selectedShape.style.stroke === color.hex }"
          type="button"
          :disabled="!canStroke"
          :style="{ background: color.hex }"
          :title="`Stroke ${color.name}: ${color.hex}`"
          @click="color.hex && (emit('setActiveColor', color.hex), emit('updateStyle', { stroke: color.hex }))"
        ></button>
      </div>
    </template>
  </section>
</template>
