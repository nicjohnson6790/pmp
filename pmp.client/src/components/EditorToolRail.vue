<script setup lang="ts">
import type { DrawingTool } from '../editor/drawingTypes'

defineProps<{
  activeTool: DrawingTool
  canDeleteSelection: boolean
  canRedo: boolean
  canUndo: boolean
  hasSelection: boolean
  isDraftingPointShape: boolean
}>()

const emit = defineEmits<{
  deleteSelection: []
  finishDraftPointShape: []
  redo: []
  setActiveTool: [tool: DrawingTool]
  undo: []
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
      E
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'move' }"
      type="button"
      title="Move selected layer"
      :disabled="!hasSelection"
      @click="emit('setActiveTool', 'move')"
    >
      M
    </button>
    <button
      class="tool-button tool-divider"
      :class="{ active: activeTool === 'brush' }"
      type="button"
      title="Brush"
      @click="emit('setActiveTool', 'brush')"
    >
      B
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'polyline' }"
      type="button"
      title="Polyline"
      @click="emit('setActiveTool', 'polyline')"
    >
      L
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'circle' }"
      type="button"
      title="Circle"
      @click="emit('setActiveTool', 'circle')"
    >
      C
    </button>
    <button
      class="tool-button"
      :class="{ active: activeTool === 'polygon' }"
      type="button"
      title="Polygon"
      @click="emit('setActiveTool', 'polygon')"
    >
      P
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
      F
    </button>
    <button class="tool-button tool-divider" type="button" title="Undo" :disabled="!canUndo" @click="emit('undo')">
      U
    </button>
    <button class="tool-button" type="button" title="Redo" :disabled="!canRedo" @click="emit('redo')">
      R
    </button>
    <button
      class="tool-button"
      type="button"
      title="Delete selected layer"
      :disabled="!canDeleteSelection"
      @click="emit('deleteSelection')"
    >
      X
    </button>
  </div>
</template>
