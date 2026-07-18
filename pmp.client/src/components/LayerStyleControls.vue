<script setup lang="ts">
import { computed } from 'vue'
import type { PaletteColorResponse } from '../api'
import type { DrawingNode, DrawingStyle, ShapeNode, TextAlign, Transform } from '../editor/drawingTypes'

const props = defineProps<{
  activeFill: string
  paletteColors: PaletteColorResponse[]
  selectedNode?: DrawingNode
  selectedShape?: ShapeNode
}>()

const emit = defineEmits<{
  setActiveColor: [hex: string]
  updateStyle: [style: Partial<DrawingStyle>]
  updateGroupTransform: [transform: Partial<Transform>]
  updateText: [text: string]
  updateTextOptions: [options: { fontFamily?: string; fontWeight?: string; textAlign?: TextAlign }]
}>()

const selectedGroup = computed(() => (props.selectedNode?.type === 'group' ? props.selectedNode : undefined))

const canFill = computed(() => {
  return props.selectedShape
    ? ['circle', 'polygon', 'text'].includes(props.selectedShape.shapeType)
    : false
})

const canStroke = computed(() => Boolean(props.selectedShape))

function updateStrokeWidth(event: Event) {
  const input = event.target as HTMLInputElement
  emit('updateStyle', { strokeWidth: Number(input.value) })
}

function updateText(event: Event) {
  const input = event.target as HTMLInputElement
  emit('updateText', input.value)
}

function updateFontFamily(event: Event) {
  const input = event.target as HTMLSelectElement
  emit('updateTextOptions', { fontFamily: input.value })
}

function updateFontWeight(event: Event) {
  const input = event.target as HTMLSelectElement
  emit('updateTextOptions', { fontWeight: input.value })
}

function updateTextAlign(event: Event) {
  const input = event.target as HTMLSelectElement
  emit('updateTextOptions', { textAlign: input.value as TextAlign })
}

function toggleTextStroke(event: Event) {
  const input = event.target as HTMLInputElement
  emit('updateStyle', {
    stroke: input.checked ? props.selectedShape?.style.stroke ?? props.selectedShape?.style.fill ?? props.activeFill : undefined,
  })
}

function updateGroupTransformNumber(key: keyof Transform, event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  emit('updateGroupTransform', {
    [key]: key === 'rotation' ? degreesToRadians(value) : value,
  })
}

function radiansToDegrees(value: number) {
  return Math.round((value * 180) / Math.PI)
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180
}
</script>

<template>
  <section class="layer-style-panel" aria-label="Layer style">
    <h2>Style</h2>
    <div v-if="!selectedNode" class="empty-state compact">Select a layer.</div>
    <template v-else-if="selectedGroup">
      <div class="transform-grid" aria-label="Group transform">
        <label>
          X
          <input
            :value="selectedGroup.transform.x"
            step="1"
            type="number"
            @change="updateGroupTransformNumber('x', $event)"
          />
        </label>
        <label>
          Y
          <input
            :value="selectedGroup.transform.y"
            step="1"
            type="number"
            @change="updateGroupTransformNumber('y', $event)"
          />
        </label>
        <label>
          Rotate
          <input
            :value="radiansToDegrees(selectedGroup.transform.rotation)"
            step="1"
            type="number"
            @change="updateGroupTransformNumber('rotation', $event)"
          />
        </label>
        <label>
          Scale X
          <input
            :value="selectedGroup.transform.scaleX"
            min="0.05"
            step="0.05"
            type="number"
            @change="updateGroupTransformNumber('scaleX', $event)"
          />
        </label>
        <label>
          Scale Y
          <input
            :value="selectedGroup.transform.scaleY"
            min="0.05"
            step="0.05"
            type="number"
            @change="updateGroupTransformNumber('scaleY', $event)"
          />
        </label>
      </div>
    </template>
    <template v-else-if="selectedShape">
      <label v-if="selectedShape.shapeType === 'text'">
        Text
        <input :value="selectedShape.text" type="text" @change="updateText" />
      </label>

      <template v-if="selectedShape.shapeType === 'text'">
        <label>
          Font
          <select :value="selectedShape.fontFamily ?? 'serif'" @change="updateFontFamily">
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans serif</option>
            <option value="monospace">Monospace</option>
            <option value="cursive">Script</option>
          </select>
        </label>

        <label>
          Weight
          <select :value="selectedShape.fontWeight ?? '700'" @change="updateFontWeight">
            <option value="400">Regular</option>
            <option value="600">Semi bold</option>
            <option value="700">Bold</option>
            <option value="900">Black</option>
          </select>
        </label>

        <label>
          Alignment
          <select :value="selectedShape.textAlign ?? 'left'" @change="updateTextAlign">
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>

        <label class="checkbox-field">
          <input :checked="Boolean(selectedShape.style.stroke)" type="checkbox" @change="toggleTextStroke" />
          Stroke text
        </label>
      </template>

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
