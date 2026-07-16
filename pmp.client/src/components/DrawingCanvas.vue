<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { DrawingDocument } from '../editor/drawingTypes'
import { renderDrawingDocument } from '../editor/drawingRender'

const props = defineProps<{
  document: DrawingDocument
  selectedNodeId?: string
}>()

const canvas = ref<HTMLCanvasElement>()

onMounted(() => {
  renderCanvas()
})

watch(
  () => [props.document, props.selectedNodeId],
  () => {
    renderCanvas()
  },
  { deep: true },
)

function renderCanvas() {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context) {
    return
  }

  renderDrawingDocument(context, props.document, props.selectedNodeId)
}
</script>

<template>
  <canvas
    ref="canvas"
    class="drawing-canvas"
    :width="document.width"
    :height="document.height"
    aria-label="Tile drawing preview"
  ></canvas>
</template>
