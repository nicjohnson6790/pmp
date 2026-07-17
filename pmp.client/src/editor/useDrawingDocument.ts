import { computed, ref, toRaw } from 'vue'
import type { DrawingDocument, DrawingStyle, DrawingTool, Point, ShapeControlPoint, ShapeNode, TextAlign } from './drawingTypes'
import { cloneDrawingDocument, identityTransform } from './drawingTypes'
import {
  findDrawingNode,
  getLayerMoveState,
  groupDrawingNode,
  isGroupNode,
  moveDrawingNode,
  moveDrawingNodeIntoPreviousGroup,
  moveDrawingNodeOutOfGroup,
  moveDrawingNodeTo,
  removeDrawingNode,
  renameDrawingNode,
  ungroupDrawingNode,
  type DropPosition,
  type ReorderDirection,
} from './drawingTree'

const minimumCircleRadius = 8
const historyLimit = 50

export function useDrawingDocument(initialDocument: DrawingDocument) {
  const document = ref(cloneDrawingDocument(initialDocument))
  const selectedNodeId = ref<string>()
  const activeTool = ref<DrawingTool>('circle')
  const activeFill = ref('#DFF7EA')
  const activeStroke = ref('#12684D')
  const draftShapeId = ref<string>()
  const draftPointShapeId = ref<string>()
  const draftBrushShapeId = ref<string>()
  const createdShapeCount = ref(0)
  const controlPointDrag = ref<{
    controlPoint: ShapeControlPoint
    lastPoint: Point
  }>()
  const shapeMoveDrag = ref<{
    lastPoint: Point
  }>()
  const undoStack = ref<DrawingDocument[]>([])
  const redoStack = ref<DrawingDocument[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const canDeleteSelection = computed(() => Boolean(selectedNodeId.value))
  const isDraftingPointShape = computed(() => Boolean(draftPointShapeId.value))
  const selectedShape = computed(() => findSelectedShape())
  const selectedNodeMoveState = computed(() => getLayerMoveState(document.value, selectedNodeId.value))
  const canGroupSelection = computed(() => Boolean(selectedNodeId.value))
  const canUngroupSelection = computed(() => isGroupNode(document.value, selectedNodeId.value))

  const selectedToolLabel = computed(() => {
    if (activeTool.value === 'circle') {
      return 'Circle'
    }

    if (activeTool.value === 'edit') {
      return 'Edit'
    }

    if (activeTool.value === 'move') {
      return 'Move'
    }

    if (activeTool.value === 'text') {
      return 'Text'
    }

    return activeTool.value
  })

  function selectNode(nodeId: string) {
    selectedNodeId.value = nodeId
    activeTool.value = 'edit'
  }

  function setActiveTool(tool: DrawingTool) {
    activeTool.value = tool
  }

  function setActiveColor(hex: string) {
    activeFill.value = hex
    activeStroke.value = hex
  }

  function beginCircle(center: Point) {
    pushHistorySnapshot()
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

  function beginPointShape(startPoint: Point, shapeType: 'polyline' | 'polygon') {
    if (draftPointShapeId.value) {
      finishDraftPointShape()
    }

    pushHistorySnapshot()
    createdShapeCount.value += 1
    const shape: ShapeNode = {
      id: `${shapeType}-${Date.now()}-${createdShapeCount.value}`,
      type: 'shape',
      shapeType,
      name: `${shapeType === 'polyline' ? 'Polyline' : 'Polygon'} ${createdShapeCount.value}`,
      transform: identityTransform(),
      style: {
        fill: shapeType === 'polygon' ? activeFill.value : undefined,
        stroke: activeStroke.value,
        strokeWidth: 8,
      },
      points: [startPoint, startPoint],
    }

    document.value.nodes.push(shape)
    draftPointShapeId.value = shape.id
    selectedNodeId.value = shape.id
  }

  function addDraftPoint(point: Point) {
    const shape = getDraftPointShape()
    if (!shape) {
      return
    }

    const previewPointIndex = shape.points.length - 1
    shape.points[previewPointIndex] = point
    shape.points.push(point)
  }

  function updateDraftPointShape(point: Point) {
    const shape = getDraftPointShape()
    if (!shape) {
      return
    }

    const previewPointIndex = shape.points.length - 1
    shape.points[previewPointIndex] = point
  }

  function finishDraftPointShape() {
    const shape = getDraftPointShape()
    if (!shape) {
      draftPointShapeId.value = undefined
      return
    }

    shape.points.pop()
    const minimumPointCount = shape.shapeType === 'polygon' ? 3 : 2
    if (shape.points.length < minimumPointCount) {
      removeDrawingNode(document.value, shape.id)
      undoStack.value.pop()
      selectedNodeId.value = undefined
    }

    draftPointShapeId.value = undefined
  }

  function beginBrush(startPoint: Point) {
    pushHistorySnapshot()
    createdShapeCount.value += 1
    const shape: ShapeNode = {
      id: `brush-${Date.now()}-${createdShapeCount.value}`,
      type: 'shape',
      shapeType: 'brush',
      name: `Brush ${createdShapeCount.value}`,
      transform: identityTransform(),
      style: {
        stroke: activeStroke.value,
        strokeWidth: 18,
      },
      points: [startPoint],
    }

    document.value.nodes.push(shape)
    draftBrushShapeId.value = shape.id
    selectedNodeId.value = shape.id
  }

  function updateDraftBrush(point: Point) {
    const shape = getDraftBrushShape()
    const lastPoint = shape?.points.at(-1)
    if (!shape || !lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 4) {
      return
    }

    shape.points.push(point)
  }

  function finishDraftBrush() {
    const shape = getDraftBrushShape()
    if (!shape) {
      draftBrushShapeId.value = undefined
      return
    }

    if (shape.points.length < 2) {
      removeDrawingNode(document.value, shape.id)
      undoStack.value.pop()
      selectedNodeId.value = undefined
    }

    draftBrushShapeId.value = undefined
  }

  function createText(point: Point) {
    pushHistorySnapshot()
    createdShapeCount.value += 1
    const shape: ShapeNode = {
      id: `text-${Date.now()}-${createdShapeCount.value}`,
      type: 'shape',
      shapeType: 'text',
      name: `Text ${createdShapeCount.value}`,
      transform: identityTransform(),
      style: {
        fill: activeFill.value,
        strokeWidth: 1,
      },
      points: [point, { x: point.x, y: point.y - 72 }],
      text: 'Text',
      fontFamily: 'serif',
      fontWeight: '700',
      textAlign: 'left',
    }

    document.value.nodes.push(shape)
    selectedNodeId.value = shape.id
    activeTool.value = 'edit'
  }

  function beginControlPointDrag(controlPoint: ShapeControlPoint, startPoint: Point) {
    if (controlPoint.nodeId !== selectedNodeId.value) {
      return
    }

    const shape = findSelectedShape()
    if (!shape) {
      return
    }

    pushHistorySnapshot()
    controlPointDrag.value = {
      controlPoint,
      lastPoint: startPoint,
    }
  }

  function updateControlPointDrag(nextPoint: Point) {
    const drag = controlPointDrag.value
    if (!drag) {
      return
    }

    const shape = findSelectedShape()
    if (!shape) {
      return
    }

    shape.points[drag.controlPoint.pointIndex] =
      shape.shapeType === 'circle' ? constrainCircleRadiusPoint(shape, nextPoint) : nextPoint
  }

  function finishControlPointDrag() {
    controlPointDrag.value = undefined
  }

  function beginShapeMove(startPoint: Point) {
    const shape = findSelectedShape()
    if (!shape) {
      return
    }

    pushHistorySnapshot()
    shapeMoveDrag.value = {
      lastPoint: startPoint,
    }
  }

  function updateShapeMove(nextPoint: Point) {
    const drag = shapeMoveDrag.value
    const shape = findSelectedShape()
    if (!drag || !shape) {
      return
    }

    const delta = {
      x: nextPoint.x - drag.lastPoint.x,
      y: nextPoint.y - drag.lastPoint.y,
    }

    shape.points = shape.points.map((point) => ({
      x: point.x + delta.x,
      y: point.y + delta.y,
    }))
    drag.lastPoint = nextPoint
  }

  function finishShapeMove() {
    shapeMoveDrag.value = undefined
  }

  function undo() {
    const previous = undoStack.value.pop()
    if (!previous) {
      return
    }

    redoStack.value.push(cloneCurrentDocument())
    document.value = previous
    clearTransientEditState()
  }

  function redo() {
    const next = redoStack.value.pop()
    if (!next) {
      return
    }

    undoStack.value.push(cloneCurrentDocument())
    document.value = next
    clearTransientEditState()
  }

  function deleteSelectedNode() {
    if (!selectedNodeId.value) {
      return
    }

    pushHistorySnapshot()
    const wasRemoved = removeDrawingNode(document.value, selectedNodeId.value)
    if (!wasRemoved) {
      undoStack.value.pop()
      return
    }

    selectedNodeId.value = undefined
    activeTool.value = 'circle'
    clearTransientEditState()
  }

  function renameNode(nodeId: string, name: string) {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    const node = findDrawingNode(document.value, nodeId)
    if (!node || node.name === trimmedName) {
      return
    }

    pushHistorySnapshot()
    renameDrawingNode(document.value, nodeId, trimmedName)
  }

  function updateSelectedShapeStyle(style: Partial<DrawingStyle>) {
    const shape = findSelectedShape()
    if (!shape) {
      return
    }

    const nextStyle = {
      ...shape.style,
      ...style,
      strokeWidth: Math.max(1, Math.min(120, style.strokeWidth ?? shape.style.strokeWidth)),
    }

    if (JSON.stringify(shape.style) === JSON.stringify(nextStyle)) {
      return
    }

    pushHistorySnapshot()
    shape.style = nextStyle
  }

  function updateSelectedText(text: string) {
    const shape = findSelectedShape()
    if (!shape || shape.shapeType !== 'text' || shape.text === text) {
      return
    }

    pushHistorySnapshot()
    shape.text = text
    if (shape.name.startsWith('Text ')) {
      shape.name = text.trim() || shape.name
    }
  }

  function updateSelectedTextOptions(options: { fontFamily?: string; fontWeight?: string; textAlign?: TextAlign }) {
    const shape = findSelectedShape()
    if (!shape || shape.shapeType !== 'text') {
      return
    }

    const nextFontFamily = options.fontFamily ?? shape.fontFamily
    const nextFontWeight = options.fontWeight ?? shape.fontWeight
    const nextTextAlign = options.textAlign ?? shape.textAlign
    if (
      shape.fontFamily === nextFontFamily &&
      shape.fontWeight === nextFontWeight &&
      shape.textAlign === nextTextAlign
    ) {
      return
    }

    pushHistorySnapshot()
    shape.fontFamily = nextFontFamily
    shape.fontWeight = nextFontWeight
    shape.textAlign = nextTextAlign
  }

  function reorderNode(nodeId: string, direction: ReorderDirection) {
    pushHistorySnapshot()
    const wasMoved = moveDrawingNode(document.value, nodeId, direction)
    if (!wasMoved) {
      undoStack.value.pop()
      return
    }

    selectedNodeId.value = nodeId
  }

  function moveNodeTo(nodeId: string, targetNodeId: string, position: DropPosition) {
    pushHistorySnapshot()
    const wasMoved = moveDrawingNodeTo(document.value, nodeId, targetNodeId, position)
    if (!wasMoved) {
      undoStack.value.pop()
      return
    }

    selectedNodeId.value = nodeId
  }

  function moveSelectedIntoPreviousGroup() {
    if (!selectedNodeId.value) {
      return
    }

    pushHistorySnapshot()
    const wasMoved = moveDrawingNodeIntoPreviousGroup(document.value, selectedNodeId.value)
    if (!wasMoved) {
      undoStack.value.pop()
    }
  }

  function moveSelectedOutOfGroup() {
    if (!selectedNodeId.value) {
      return
    }

    pushHistorySnapshot()
    const wasMoved = moveDrawingNodeOutOfGroup(document.value, selectedNodeId.value)
    if (!wasMoved) {
      undoStack.value.pop()
    }
  }

  function groupSelectedNode() {
    if (!selectedNodeId.value) {
      return
    }

    pushHistorySnapshot()
    const groupId = groupDrawingNode(document.value, selectedNodeId.value)
    if (!groupId) {
      undoStack.value.pop()
      return
    }

    selectedNodeId.value = groupId
  }

  function ungroupSelectedNode() {
    if (!selectedNodeId.value) {
      return
    }

    pushHistorySnapshot()
    const childIds = ungroupDrawingNode(document.value, selectedNodeId.value)
    if (childIds.length === 0) {
      undoStack.value.pop()
      return
    }

    selectedNodeId.value = childIds[0]
  }

  function replaceDocument(nextDocument: DrawingDocument) {
    document.value = cloneDrawingDocument(nextDocument)
    selectedNodeId.value = undefined
    activeTool.value = 'circle'
    undoStack.value = []
    redoStack.value = []
    clearTransientEditState()
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

  function getDraftPointShape() {
    const id = draftPointShapeId.value
    if (!id) {
      return undefined
    }

    const node = findDrawingNode(document.value, id)
    return node?.type === 'shape' && (node.shapeType === 'polyline' || node.shapeType === 'polygon') ? node : undefined
  }

  function getDraftBrushShape() {
    const id = draftBrushShapeId.value
    if (!id) {
      return undefined
    }

    const node = findDrawingNode(document.value, id)
    return node?.type === 'shape' && node.shapeType === 'brush' ? node : undefined
  }

  function constrainCircleRadiusPoint(shape: ShapeNode, nextPoint: Point) {
    const center = shape.points[0]
    if (!center) {
      return nextPoint
    }

    const radius = Math.hypot(nextPoint.x - center.x, nextPoint.y - center.y)
    if (radius >= minimumCircleRadius) {
      return nextPoint
    }

    const angle = radius === 0 ? 0 : Math.atan2(nextPoint.y - center.y, nextPoint.x - center.x)
    return {
      x: center.x + Math.cos(angle) * minimumCircleRadius,
      y: center.y + Math.sin(angle) * minimumCircleRadius,
    }
  }

  function findSelectedShape() {
    const node = findDrawingNode(document.value, selectedNodeId.value)
    return node?.type === 'shape' ? node : undefined
  }

  function pushHistorySnapshot() {
    undoStack.value.push(cloneCurrentDocument())
    if (undoStack.value.length > historyLimit) {
      undoStack.value.shift()
    }

    redoStack.value = []
  }

  function cloneCurrentDocument() {
    return cloneDrawingDocument(toRaw(document.value))
  }

  function clearTransientEditState() {
    draftShapeId.value = undefined
    draftPointShapeId.value = undefined
    draftBrushShapeId.value = undefined
    controlPointDrag.value = undefined
    shapeMoveDrag.value = undefined
  }

  return {
    activeFill,
    activeStroke,
    activeTool,
    canDeleteSelection,
    canGroupSelection,
    canRedo,
    canUngroupSelection,
    canUndo,
    document,
    isDraftingPointShape,
    selectedNodeId,
    selectedNodeMoveState,
    selectedShape,
    selectedToolLabel,
    addDraftPoint,
    beginBrush,
    beginCircle,
    beginControlPointDrag,
    beginPointShape,
    beginShapeMove,
    createText,
    deleteSelectedNode,
    finishDraftBrush,
    finishDraftCircle,
    finishDraftPointShape,
    finishControlPointDrag,
    finishShapeMove,
    groupSelectedNode,
    moveNodeTo,
    moveSelectedIntoPreviousGroup,
    moveSelectedOutOfGroup,
    redo,
    renameNode,
    replaceDocument,
    reorderNode,
    selectNode,
    setActiveColor,
    setActiveTool,
    undo,
    ungroupSelectedNode,
    updateControlPointDrag,
    updateDraftBrush,
    updateDraftCircle,
    updateDraftPointShape,
    updateSelectedShapeStyle,
    updateSelectedText,
    updateSelectedTextOptions,
    updateShapeMove,
  }
}
