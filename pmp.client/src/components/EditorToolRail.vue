<script setup lang="ts">
import type { DrawingTool } from '../editor/drawingTypes'

defineProps<{
  activeTool: DrawingTool
  canDeleteSelection: boolean
  canRedo: boolean
  canUndo: boolean
  hasSelection: boolean
  isDraftingPointShape: boolean
  zoomLabel: string
}>()

const emit = defineEmits<{
  deleteSelection: []
  finishDraftPointShape: []
  redo: []
  resetZoom: []
  setActiveTool: [tool: DrawingTool]
  undo: []
  zoomIn: []
  zoomOut: []
}>()
</script>

<template>
  <div class="tool-rail" aria-label="Editor tools">
    <button
      class="tool-button"
      :class="{ active: activeTool === 'edit' }"
      type="button"
      title="Edit selected control points"
      :disabled="!hasSelection"
      @click="emit('setActiveTool', 'edit')"
    >
      ✣
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'move' }"
      type="button"
      title="Move selected layer"
      :disabled="!hasSelection"
      @click="emit('setActiveTool', 'move')"
    >
      ✥
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'pan' }"
      type="button"
      title="Pan canvas"
      @click="emit('setActiveTool', 'pan')"
    >
      ✢
    </button>
    <button
      class="tool-button tool-divider"
      :class="{ active: activeTool === 'brush' }"
      type="button"
      title="Brush"
      @click="emit('setActiveTool', 'brush')"
    >
      ◡
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'polyline' }"
      type="button"
      title="Polyline"
      @click="emit('setActiveTool', 'polyline')"
    >
      ╱
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'circle' }"
      type="button"
      title="Circle"
      @click="emit('setActiveTool', 'circle')"
    >
      ○
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'polygon' }"
      type="button"
      title="Polygon"
      @click="emit('setActiveTool', 'polygon')"
    >
      ◇
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'text' }"
      type="button"
      title="Text"
      @click="emit('setActiveTool', 'text')"
    >
      T
    </button>
    <button
      class="tool-button"
      type="button"
      title="Finish polyline or polygon"
      :disabled="!isDraftingPointShape"
      @click="emit('finishDraftPointShape')"
    >
      ✓
    </button>
    <button class="tool-button tool-divider" type="button" title="Zoom out" @click="emit('zoomOut')">−</button>
    <button class="tool-button zoom-label" type="button" title="Reset zoom" @click="emit('resetZoom')">
      {{ zoomLabel }}
    </button>
    <button class="tool-button" type="button" title="Zoom in" @click="emit('zoomIn')">+</button>
    <button class="tool-button tool-divider" type="button" title="Undo" :disabled="!canUndo" @click="emit('undo')">
      ↶
    </button>
    <button class="tool-button" type="button" title="Redo" :disabled="!canRedo" @click="emit('redo')">
      ↷
    </button>
    <button
      class="tool-button"
      type="button"
      title="Delete selected layer"
      :disabled="!canDeleteSelection"
      @click="emit('deleteSelection')"
    >
      ×
    </button>
  </div>
</template>
