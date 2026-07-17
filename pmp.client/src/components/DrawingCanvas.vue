<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { DrawingDocument, DrawingTool, Point, ShapeControlPoint } from '../editor/drawingTypes'
import { getDocumentControlPoints, renderDrawingDocument } from '../editor/drawingRender'

const props = defineProps<{
  activeTool: DrawingTool
  document: DrawingDocument
  isDraftingPointShape: boolean
  selectedNodeId?: string
}>()

const emit = defineEmits<{
  beginCircle: [center: Point]
  updateCircle: [radiusPoint: Point]
  finishCircle: []
  beginBrush: [point: Point]
  updateBrush: [point: Point]
  finishBrush: []
  createText: [point: Point]
  beginPointShape: [point: Point, shapeType: 'polyline' | 'polygon']
  addDraftPoint: [point: Point]
  updateDraftPointShape: [point: Point]
  finishDraftPointShape: []
  beginControlPointDrag: [controlPoint: ShapeControlPoint, startPoint: Point]
  updateControlPointDrag: [point: Point]
  finishControlPointDrag: []
  beginShapeMove: [startPoint: Point]
  updateShapeMove: [point: Point]
  finishShapeMove: []
}>()

const canvas = ref<HTMLCanvasElement>()
const isDrawing = ref(false)
const isBrushing = ref(false)
const isDraggingControlPoint = ref(false)
const isMovingShape = ref(false)

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
  if (
    event.button === 2 &&
    props.isDraftingPointShape &&
    (props.activeTool === 'polyline' || props.activeTool === 'polygon')
  ) {
    event.preventDefault()
    emit('finishDraftPointShape')
    return
  }

  const documentPoint = getDocumentPoint(event)

  if (props.activeTool === 'edit') {
    const controlPoint = findControlPointAt(documentPoint)
    if (!controlPoint) {
      return
    }

    isDraggingControlPoint.value = true
    canvas.value?.setPointerCapture(event.pointerId)
    emit('beginControlPointDrag', controlPoint, documentPoint)
    return
  }

  if (props.activeTool === 'move' && props.selectedNodeId) {
    isMovingShape.value = true
    canvas.value?.setPointerCapture(event.pointerId)
    emit('beginShapeMove', documentPoint)
    return
  }

  if (props.activeTool === 'text') {
    emit('createText', documentPoint)
    return
  }

  if (props.activeTool === 'brush') {
    isBrushing.value = true
    canvas.value?.setPointerCapture(event.pointerId)
    emit('beginBrush', documentPoint)
    return
  }

  if (props.activeTool === 'polyline' || props.activeTool === 'polygon') {
    if (props.isDraftingPointShape) {
      emit('addDraftPoint', documentPoint)
    } else {
      emit('beginPointShape', documentPoint, props.activeTool)
    }
    return
  }

  if (props.activeTool !== 'circle') {
    return
  }

  isDrawing.value = true
  canvas.value?.setPointerCapture(event.pointerId)
  emit('beginCircle', documentPoint)
}

function handlePointerMove(event: PointerEvent) {
  if (isBrushing.value) {
    emit('updateBrush', getDocumentPoint(event))
    return
  }

  if (isMovingShape.value) {
    emit('updateShapeMove', getDocumentPoint(event))
    return
  }

  if (isDraggingControlPoint.value) {
    emit('updateControlPointDrag', getDocumentPoint(event))
    return
  }

  if ((props.activeTool === 'polyline' || props.activeTool === 'polygon') && props.isDraftingPointShape) {
    emit('updateDraftPointShape', getDocumentPoint(event))
    return
  }

  if (!isDrawing.value || props.activeTool !== 'circle') {
    return
  }

  emit('updateCircle', getDocumentPoint(event))
}

function handlePointerUp(event: PointerEvent) {
  if (isBrushing.value) {
    isBrushing.value = false
    canvas.value?.releasePointerCapture(event.pointerId)
    emit('updateBrush', getDocumentPoint(event))
    emit('finishBrush')
    return
  }

  if (isMovingShape.value) {
    isMovingShape.value = false
    canvas.value?.releasePointerCapture(event.pointerId)
    emit('updateShapeMove', getDocumentPoint(event))
    emit('finishShapeMove')
    return
  }

  if (isDraggingControlPoint.value) {
    isDraggingControlPoint.value = false
    canvas.value?.releasePointerCapture(event.pointerId)
    emit('updateControlPointDrag', getDocumentPoint(event))
    emit('finishControlPointDrag')
    return
  }

  if (!isDrawing.value) {
    return
  }

  isDrawing.value = false
  canvas.value?.releasePointerCapture(event.pointerId)
  emit('updateCircle', getDocumentPoint(event))
  emit('finishCircle')
}

function handleDoubleClick(event: MouseEvent) {
  if ((props.activeTool !== 'polyline' && props.activeTool !== 'polygon') || !props.isDraftingPointShape) {
    return
  }

  event.preventDefault()
  emit('finishDraftPointShape')
}

function handleContextMenu(event: MouseEvent) {
  if ((props.activeTool !== 'polyline' && props.activeTool !== 'polygon') || !props.isDraftingPointShape) {
    return
  }

  event.preventDefault()
}

function findControlPointAt(documentPoint: Point): ShapeControlPoint | undefined {
  const hitRadius = 20
  return getDocumentControlPoints(props.document, props.selectedNodeId).find((controlPoint) => {
    return Math.hypot(controlPoint.point.x - documentPoint.x, controlPoint.point.y - documentPoint.y) <= hitRadius
  })
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
    :class="{ editing: activeTool === 'edit', moving: activeTool === 'move' }"
    :width="document.width"
    :height="document.height"
    aria-label="Tile drawing preview"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @dblclick="handleDoubleClick"
    @contextmenu="handleContextMenu"
  ></canvas>
</template>
