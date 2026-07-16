import { computed, ref } from 'vue'
import type { DrawingDocument, DrawingTool, Point, ShapeNode } from './drawingTypes'
import { cloneDrawingDocument, identityTransform } from './drawingTypes'

const minimumCircleRadius = 8

export function useDrawingDocument(initialDocument: DrawingDocument) {
  const document = ref(cloneDrawingDocument(initialDocument))
  const selectedNodeId = ref<string>()
  const activeTool = ref<DrawingTool>('circle')
  const activeFill = ref('#DFF7EA')
  const activeStroke = ref('#12684D')
  const draftShapeId = ref<string>()
  const createdShapeCount = ref(0)

  const selectedToolLabel = computed(() => {
    return activeTool.value === 'circle' ? 'Circle' : activeTool.value
  })

  function selectNode(nodeId: string) {
    selectedNodeId.value = nodeId
  }

  function setActiveTool(tool: DrawingTool) {
    activeTool.value = tool
  }

  function setActiveColor(hex: string) {
    activeFill.value = hex
    activeStroke.value = hex
  }

  function beginCircle(center: Point) {
    createdShapeCount.value += 1
    const shape: ShapeNode = {
      id: `circle-${Date.now()}-${createdShapeCount.value}`,
      type: 'shape',
      shapeType: 'circle',
      name: `Circle ${createdShapeCount.value}`,
      transform: identityTransform(),
      style: {
        fill: activeFill.value,
        stroke: activeStroke.value,
        strokeWidth: 8,
      },
      points: [center, { x: center.x + minimumCircleRadius, y: center.y }],
    }

    document.value.nodes.push(shape)
    draftShapeId.value = shape.id
    selectedNodeId.value = shape.id
  }

  function updateDraftCircle(radiusPoint: Point) {
    const shape = getDraftCircle()
    if (!shape) {
      return
    }

    shape.points[1] = radiusPoint
  }

  function finishDraftCircle() {
    const shape = getDraftCircle()
    if (!shape) {
      draftShapeId.value = undefined
      return
    }

    const center = shape.points[0]
    const radiusPoint = shape.points[1]
    if (!center || !radiusPoint || Math.hypot(radiusPoint.x - center.x, radiusPoint.y - center.y) < minimumCircleRadius) {
      shape.points[1] = { x: center?.x ?? minimumCircleRadius, y: center?.y ?? 0 }
    }

    draftShapeId.value = undefined
  }

  function getDraftCircle() {
    const id = draftShapeId.value
    if (!id) {
      return undefined
    }

    return document.value.nodes.find(
      (node): node is ShapeNode => node.id === id && node.type === 'shape' && node.shapeType === 'circle',
    )
  }

  return {
    activeFill,
    activeStroke,
    activeTool,
    document,
    selectedNodeId,
    selectedToolLabel,
    beginCircle,
    finishDraftCircle,
    selectNode,
    setActiveColor,
    setActiveTool,
    updateDraftCircle,
  }
}
