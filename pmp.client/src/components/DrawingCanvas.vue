<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { DrawingDocument, DrawingTool, Point } from '../editor/drawingTypes'
import { renderDrawingDocument } from '../editor/drawingRender'

const props = defineProps<{
  activeTool: DrawingTool
  document: DrawingDocument
  selectedNodeId?: string
}>()

const emit = defineEmits<{
  beginCircle: [center: Point]
  updateCircle: [radiusPoint: Point]
  finishCircle: []
}>()

const canvas = ref<HTMLCanvasElement>()
const isDrawing = ref(false)

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

function handlePointerDown(event: PointerEvent) {
  if (props.activeTool !== 'circle') {
    return
  }

  isDrawing.value = true
  canvas.value?.setPointerCapture(event.pointerId)
  emit('beginCircle', getDocumentPoint(event))
}

function handlePointerMove(event: PointerEvent) {
  if (!isDrawing.value || props.activeTool !== 'circle') {
    return
  }

  emit('updateCircle', getDocumentPoint(event))
}

function handlePointerUp(event: PointerEvent) {
  if (!isDrawing.value) {
    return
  }

  isDrawing.value = false
  canvas.value?.releasePointerCapture(event.pointerId)
  emit('updateCircle', getDocumentPoint(event))
  emit('finishCircle')
}

function getDocumentPoint(event: PointerEvent): Point {
  const element = canvas.value
  if (!element) {
    return { x: 0, y: 0 }
  }

  const bounds = element.getBoundingClientRect()
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * props.document.width,
    y: ((event.clientY - bounds.top) / bounds.height) * props.document.height,
  }
}
</script>

<template>
  <canvas
    ref="canvas"
    class="drawing-canvas"
    :width="document.width"
    :height="document.height"
    aria-label="Tile drawing preview"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  ></canvas>
</template>
