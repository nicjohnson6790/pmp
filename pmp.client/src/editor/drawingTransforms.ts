import type { DrawingNode, Point, Transform } from './drawingTypes'
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

export function transformToMatrix(transform: Transform): Matrix {
  const cos = Math.cos(transform.rotation)
  const sin = Math.sin(transform.rotation)

  return {
    a: cos * transform.scaleX,
    b: sin * transform.scaleX,
    c: -sin * transform.scaleY,
    d: cos * transform.scaleY,
    e: transform.x,
    f: transform.y,
  }
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

export function matrixToTransform(matrix: Matrix): Transform {
  const scaleX = Math.hypot(matrix.a, matrix.b) || 1
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  const scaleY = determinant / scaleX || 1

  return {
    x: matrix.e,
    y: matrix.f,
    rotation: Math.atan2(matrix.b, matrix.a),
    scaleX,
    scaleY,
  }
}

export function getNodeWorldMatrix(node: DrawingNode, ancestors: DrawingNode[] = []): Matrix {
  const parentMatrix = ancestors.reduce(
    (matrix, ancestor) => multiplyMatrices(matrix, transformToMatrix(ancestor.transform)),
    identityMatrix,
  )

  return multiplyMatrices(parentMatrix, transformToMatrix(node.transform))
}

export function setNodeWorldMatrix(node: DrawingNode, ancestors: DrawingNode[], targetWorldMatrix: Matrix) {
  const parentWorldMatrix = ancestors.reduce(
    (matrix, ancestor) => multiplyMatrices(matrix, transformToMatrix(ancestor.transform)),
    identityMatrix,
  )
  const localMatrix = multiplyMatrices(invertMatrix(parentWorldMatrix), targetWorldMatrix)
  node.transform = matrixToTransform(localMatrix)
}

export function resetTransform(): Transform {
  return identityTransform()
}
