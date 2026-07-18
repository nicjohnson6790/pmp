import type { DrawingDocument, DrawingNode, ShapeControlPoint, ShapeNode } from './drawingTypes'
import { findDrawingNodeLocation } from './drawingTree'
import { applyMatrixToPoint, getNodeWorldMatrix, nodeToMatrix } from './drawingTransforms'

const selectionColor = '#16845F'

export function renderDrawingDocument(
  context: CanvasRenderingContext2D,
  document: DrawingDocument,
  selectedNodeId?: string,
) {
  context.clearRect(0, 0, document.width, document.height)
  context.fillStyle = document.background
  context.fillRect(0, 0, document.width, document.height)

  for (const node of document.nodes) {
    renderNode(context, node)
  }

  drawDocumentSelection(context, document, selectedNodeId)
}

function renderNode(context: CanvasRenderingContext2D, node: DrawingNode) {
  context.save()
  applyMatrix(context, nodeToMatrix(node))

  if (node.type === 'group') {
    for (const child of node.children) {
      renderNode(context, child)
    }
  } else {
    renderShape(context, node)
  }

  context.restore()
}

function renderShape(context: CanvasRenderingContext2D, shape: ShapeNode) {
  if (shape.points.length === 0) {
    return
  }

  if (shape.shapeType === 'text') {
    renderText(context, shape)
    return
  }

  context.lineCap = shape.shapeType === 'brush' ? 'round' : 'butt'
  context.lineJoin = 'round'
  context.lineWidth = shape.style.strokeWidth

  if (shape.shapeType === 'circle') {
    drawCirclePath(context, shape)
  } else {
    drawPointPath(context, shape)
  }

  if (shape.style.fill && (shape.shapeType === 'circle' || shape.shapeType === 'polygon')) {
    context.fillStyle = shape.style.fill
    context.fill()
  }

  if (shape.style.stroke) {
    context.strokeStyle = shape.style.stroke
    context.stroke()
  }
}

function renderText(context: CanvasRenderingContext2D, shape: ShapeNode) {
  const baseline = shape.points[0]
  const heightPoint = shape.points[1]
  if (!baseline || !heightPoint) {
    return
  }

  const height = Math.max(12, Math.hypot(heightPoint.x - baseline.x, heightPoint.y - baseline.y))
  const rotation = Math.atan2(heightPoint.y - baseline.y, heightPoint.x - baseline.x) + Math.PI / 2

  context.save()
  context.translate(baseline.x, baseline.y)
  context.rotate(rotation)
  context.font = `${shape.fontWeight ?? '700'} ${height}px ${shape.fontFamily ?? 'serif'}`
  context.textAlign = shape.textAlign ?? 'left'
  context.textBaseline = 'alphabetic'
  context.lineWidth = shape.style.strokeWidth
  if (shape.style.stroke) {
    context.strokeStyle = shape.style.stroke
    context.strokeText(shape.text ?? '', 0, 0)
  }
  if (shape.style.fill) {
    context.fillStyle = shape.style.fill
    context.fillText(shape.text ?? '', 0, 0)
  }
  context.restore()
}

function drawPointPath(context: CanvasRenderingContext2D, shape: ShapeNode) {
  const firstPoint = shape.points[0]
  if (!firstPoint) {
    return
  }

  context.beginPath()
  context.moveTo(firstPoint.x, firstPoint.y)

  for (const point of shape.points.slice(1)) {
    context.lineTo(point.x, point.y)
  }

  if (shape.shapeType === 'polygon') {
    context.closePath()
  }
}

function drawCirclePath(context: CanvasRenderingContext2D, shape: ShapeNode) {
  const center = shape.points[0]
  const radiusPoint = shape.points[1]
  if (!center || !radiusPoint) {
    return
  }

  const radius = Math.hypot(radiusPoint.x - center.x, radiusPoint.y - center.y)
  context.beginPath()
  context.arc(center.x, center.y, radius, 0, Math.PI * 2)
}

function drawDocumentSelection(context: CanvasRenderingContext2D, document: DrawingDocument, selectedNodeId?: string) {
  const location = findDrawingNodeLocation(document, selectedNodeId)
  if (!location) {
    return
  }

  for (const controlPoint of getDocumentControlPoints(document, selectedNodeId)) {
    context.beginPath()
    context.fillStyle = '#FFFFFF'
    context.strokeStyle = selectionColor
    context.lineWidth = 5
    context.arc(controlPoint.point.x, controlPoint.point.y, 12, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }
}

export function getDocumentControlPoints(document: DrawingDocument, selectedNodeId?: string): ShapeControlPoint[] {
  const location = findDrawingNodeLocation(document, selectedNodeId)
  if (!location || location.node.type !== 'shape') {
    return []
  }

  const worldMatrix = getNodeWorldMatrix(location.node, location.parents)
  return getShapeControlPoints(location.node).map((controlPoint) => ({
    ...controlPoint,
    point: applyMatrixToPoint(worldMatrix, controlPoint.localPoint),
  }))
}

function getShapeControlPoints(shape: ShapeNode): ShapeControlPoint[] {
  return shape.points.map((point, index) => ({
    nodeId: shape.id,
    pointIndex: index,
    point,
    localPoint: point,
  }))
}

function applyMatrix(context: CanvasRenderingContext2D, matrix: ReturnType<typeof nodeToMatrix>) {
  context.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
}
