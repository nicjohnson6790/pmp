import type { DrawingNode, Point, ShapeNode, Transform } from './drawingTypes'
import { identityTransform } from './drawingTypes'

export type Matrix = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const identityMatrix: Matrix = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
}

export function transformToMatrix(transform: Transform, origin: Point = { x: 0, y: 0 }): Matrix {
  const cos = Math.cos(transform.rotation)
  const sin = Math.sin(transform.rotation)

  return {
    a: cos * transform.scaleX,
    b: sin * transform.scaleX,
    c: -sin * transform.scaleY,
    d: cos * transform.scaleY,
    e: transform.x + origin.x - cos * transform.scaleX * origin.x + sin * transform.scaleY * origin.y,
    f: transform.y + origin.y - sin * transform.scaleX * origin.x - cos * transform.scaleY * origin.y,
  }
}

export function nodeToMatrix(node: DrawingNode): Matrix {
  return transformToMatrix(node.transform, getNodeTransformOrigin(node))
}

export function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

export function invertMatrix(matrix: Matrix): Matrix {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (Math.abs(determinant) < 0.000001) {
    return identityMatrix
  }

  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  }
}

export function applyMatrixToPoint(matrix: Matrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

export function matrixToTransform(matrix: Matrix, origin: Point = { x: 0, y: 0 }): Transform {
  const scaleX = Math.hypot(matrix.a, matrix.b) || 1
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  const scaleY = determinant / scaleX || 1

  return {
    x: matrix.e - origin.x + matrix.a * origin.x + matrix.c * origin.y,
    y: matrix.f - origin.y + matrix.b * origin.x + matrix.d * origin.y,
    rotation: Math.atan2(matrix.b, matrix.a),
    scaleX,
    scaleY,
  }
}

export function getNodeWorldMatrix(node: DrawingNode, ancestors: DrawingNode[] = []): Matrix {
  const parentMatrix = ancestors.reduce(
    (matrix, ancestor) => multiplyMatrices(matrix, nodeToMatrix(ancestor)),
    identityMatrix,
  )

  return multiplyMatrices(parentMatrix, nodeToMatrix(node))
}

export function setNodeWorldMatrix(node: DrawingNode, ancestors: DrawingNode[], targetWorldMatrix: Matrix) {
  const parentWorldMatrix = ancestors.reduce(
    (matrix, ancestor) => multiplyMatrices(matrix, nodeToMatrix(ancestor)),
    identityMatrix,
  )
  const localMatrix = multiplyMatrices(invertMatrix(parentWorldMatrix), targetWorldMatrix)
  node.transform = matrixToTransform(localMatrix, getNodeTransformOrigin(node))
}

export function resetTransform(): Transform {
  return identityTransform()
}

export function getNodeTransformOrigin(node: DrawingNode): Point {
  if (node.type === 'shape') {
    return { x: 0, y: 0 }
  }

  const bounds = getNodeLocalBounds(node)
  if (!bounds) {
    return { x: 0, y: 0 }
  }

  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

export function getNodeLocalBounds(node: DrawingNode): { x: number; y: number; width: number; height: number } | undefined {
  if (node.type === 'shape') {
    return getShapeLocalBounds(node)
  }

  const childBounds = node.children
    .map((child) => {
      const bounds = getNodeLocalBounds(child)
      return bounds ? transformBounds(bounds, nodeToMatrix(child)) : undefined
    })
    .filter((bounds) => Boolean(bounds))

  if (childBounds.length === 0) {
    return undefined
  }

  const minX = Math.min(...childBounds.map((bounds) => bounds!.x))
  const minY = Math.min(...childBounds.map((bounds) => bounds!.y))
  const maxX = Math.max(...childBounds.map((bounds) => bounds!.x + bounds!.width))
  const maxY = Math.max(...childBounds.map((bounds) => bounds!.y + bounds!.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function transformBounds(bounds: { x: number; y: number; width: number; height: number }, matrix: Matrix) {
  const points = [
    applyMatrixToPoint(matrix, { x: bounds.x, y: bounds.y }),
    applyMatrixToPoint(matrix, { x: bounds.x + bounds.width, y: bounds.y }),
    applyMatrixToPoint(matrix, { x: bounds.x + bounds.width, y: bounds.y + bounds.height }),
    applyMatrixToPoint(matrix, { x: bounds.x, y: bounds.y + bounds.height }),
  ]

  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function getShapeLocalBounds(shape: ShapeNode) {
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

  if (shape.shapeType === 'text') {
    const baseline = shape.points[0]
    const heightPoint = shape.points[1]
    if (!baseline || !heightPoint) {
      return undefined
    }

    const height = Math.max(12, Math.hypot(heightPoint.x - baseline.x, heightPoint.y - baseline.y))
    const width = Math.max(height * 2, (shape.text?.length ?? 1) * height * 0.55)
    return {
      x: baseline.x - height,
      y: baseline.y - height - 12,
      width: width + height * 2,
      height: height * 2,
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
