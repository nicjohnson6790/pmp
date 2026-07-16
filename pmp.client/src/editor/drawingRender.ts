import type { DrawingDocument, DrawingNode, ShapeControlPoint, ShapeNode, Transform } from './drawingTypes'
import { findDrawingNode } from './drawingTree'

const selectionColor = '#16845F'
const baseHandleColor = '#0A3A2C'

export function renderDrawingDocument(
  context: CanvasRenderingContext2D,
  document: DrawingDocument,
  selectedNodeId?: string,
) {
  context.clearRect(0, 0, document.width, document.height)
  context.fillStyle = document.background
  context.fillRect(0, 0, document.width, document.height)

  for (const node of document.nodes) {
    renderNode(context, node, selectedNodeId)
  }
}

function renderNode(context: CanvasRenderingContext2D, node: DrawingNode, selectedNodeId?: string) {
  context.save()
  applyTransform(context, node.transform)

  if (node.type === 'group') {
    for (const child of node.children) {
      renderNode(context, child, selectedNodeId)
    }
  } else {
    renderShape(context, node)
    if (node.id === selectedNodeId) {
      drawShapeSelection(context, node)
    }
  }

  context.restore()
}

function renderShape(context: CanvasRenderingContext2D, shape: ShapeNode) {
  if (shape.points.length === 0) {
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

function drawShapeSelection(context: CanvasRenderingContext2D, shape: ShapeNode) {
  const bounds = getShapeBounds(shape)
  if (!bounds) {
    return
  }

  context.save()
  context.setLineDash([18, 10])
  context.lineWidth = 5
  context.strokeStyle = selectionColor
  context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
  context.restore()

  for (const controlPoint of getShapeControlPoints(shape)) {
    context.beginPath()
    context.fillStyle = controlPoint.kind === 'base' ? baseHandleColor : '#FFFFFF'
    context.strokeStyle = selectionColor
    context.lineWidth = 5
    context.arc(controlPoint.point.x, controlPoint.point.y, controlPoint.kind === 'base' ? 14 : 12, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }
}

export function getDocumentControlPoints(document: DrawingDocument, selectedNodeId?: string): ShapeControlPoint[] {
  const node = findDrawingNode(document, selectedNodeId)
  if (!node || node.type !== 'shape') {
    return []
  }

  return getShapeControlPoints(node)
}

function getShapeControlPoints(shape: ShapeNode): ShapeControlPoint[] {
  return shape.points.map((point, index) => ({
    nodeId: shape.id,
    pointIndex: index,
    kind: index === 0 ? 'base' : 'point',
    point,
  }))
}

function getShapeBounds(shape: ShapeNode) {
  if (shape.points.length === 0) {
    return undefined
  }

  if (shape.shapeType === 'circle') {
    const center = shape.points[0]
    const radiusPoint = shape.points[1]
    if (!center || !radiusPoint) {
      return undefined
    }

    const radius = Math.hypot(radiusPoint.x - center.x, radiusPoint.y - center.y)
    return {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    }
  }

  const xValues = shape.points.map((point) => point.x)
  const yValues = shape.points.map((point) => point.y)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)

  const padding = Math.max(shape.style.strokeWidth / 2, 12)
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

function applyTransform(context: CanvasRenderingContext2D, transform: Transform) {
  context.translate(transform.x, transform.y)
  context.rotate(transform.rotation)
  context.scale(transform.scaleX, transform.scaleY)
}
