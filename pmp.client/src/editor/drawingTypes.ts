export type Point = {
  x: number
  y: number
}

export type Transform = {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

export type ShapeType = 'circle' | 'polyline' | 'polygon' | 'brush' | 'text'

export type DrawingTool = ShapeType | 'edit' | 'move' | 'pan'

export type TextAlign = 'left' | 'center' | 'right'

export type ShapeControlPoint = {
  nodeId: string
  pointIndex: number
  point: Point
  localPoint: Point
}

export type DrawingStyle = {
  fill?: string
  stroke?: string
  strokeWidth: number
}

export type ShapeNode = {
  id: string
  type: 'shape'
  shapeType: ShapeType
  name: string
  transform: Transform
  style: DrawingStyle
  points: Point[]
  text?: string
  fontFamily?: string
  fontWeight?: string
  textAlign?: TextAlign
}

export type GroupNode = {
  id: string
  type: 'group'
  name: string
  transform: Transform
  children: DrawingNode[]
}

export type DrawingNode = GroupNode | ShapeNode

export type DrawingDocument = {
  version: 1
  width: number
  height: number
  background: string
  nodes: DrawingNode[]
}

export type FlattenedDrawingNode = {
  node: DrawingNode
  depth: number
}

export function identityTransform(): Transform {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  }
}

export function cloneDrawingDocument(document: DrawingDocument): DrawingDocument {
  return JSON.parse(JSON.stringify(document)) as DrawingDocument
}
