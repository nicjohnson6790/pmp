import { describe, expect, it } from 'vitest'
import type { DrawingDocument, ShapeNode } from './drawingTypes'
import { identityTransform } from './drawingTypes'
import { useDrawingDocument } from './useDrawingDocument'

function emptyDocument(): DrawingDocument {
  return {
    version: 1,
    width: 1414,
    height: 1000,
    background: '#FFFFFF',
    nodes: [],
  }
}

function circleDocument(): DrawingDocument {
  return {
    ...emptyDocument(),
    nodes: [
      {
        id: 'circle-1',
        type: 'shape',
        shapeType: 'circle',
        name: 'Circle 1',
        transform: identityTransform(),
        style: {
          fill: '#DFF7EA',
          stroke: '#12684D',
          strokeWidth: 8,
        },
        points: [
          { x: 100, y: 100 },
          { x: 140, y: 100 },
        ],
      },
    ],
  }
}

function firstShape(document: DrawingDocument): ShapeNode {
  const node = document.nodes[0]
  expect(node?.type).toBe('shape')
  return node as ShapeNode
}

describe('useDrawingDocument', () => {
  it('creates a circle and records undo/redo history', () => {
    const store = useDrawingDocument(emptyDocument())

    store.beginCircle({ x: 100, y: 100 })
    store.updateDraftCircle({ x: 160, y: 100 })
    store.finishDraftCircle()

    expect(store.document.value.nodes).toHaveLength(1)
    expect(firstShape(store.document.value).shapeType).toBe('circle')
    expect(firstShape(store.document.value).points).toEqual([
      { x: 100, y: 100 },
      { x: 160, y: 100 },
    ])

    store.undo()
    expect(store.document.value.nodes).toHaveLength(0)

    store.redo()
    expect(store.document.value.nodes).toHaveLength(1)
  })

  it('moves the selected shape as a single undoable edit', () => {
    const store = useDrawingDocument(circleDocument())

    store.selectNode('circle-1')
    store.beginShapeMove({ x: 100, y: 100 })
    store.updateShapeMove({ x: 125, y: 90 })
    store.finishShapeMove()

    expect(firstShape(store.document.value).points).toEqual([
      { x: 125, y: 90 },
      { x: 165, y: 90 },
    ])

    store.undo()
    expect(firstShape(store.document.value).points).toEqual([
      { x: 100, y: 100 },
      { x: 140, y: 100 },
    ])
  })

  it('edits a selected control point as a single undoable edit', () => {
    const store = useDrawingDocument(circleDocument())

    store.selectNode('circle-1')
    store.beginControlPointDrag(
      {
        nodeId: 'circle-1',
        pointIndex: 1,
        point: { x: 140, y: 100 },
      },
      { x: 140, y: 100 },
    )
    store.updateControlPointDrag({ x: 180, y: 100 })
    store.finishControlPointDrag()

    expect(firstShape(store.document.value).points[1]).toEqual({ x: 180, y: 100 })

    store.undo()
    expect(firstShape(store.document.value).points[1]).toEqual({ x: 140, y: 100 })
  })

  it('deletes the selected layer and restores it through undo/redo', () => {
    const store = useDrawingDocument(circleDocument())

    store.selectNode('circle-1')
    store.deleteSelectedNode()

    expect(store.document.value.nodes).toHaveLength(0)

    store.undo()
    expect(store.document.value.nodes).toHaveLength(1)

    store.redo()
    expect(store.document.value.nodes).toHaveLength(0)
  })

  it('creates point-based polyline and polygon shapes', () => {
    const store = useDrawingDocument(emptyDocument())

    store.beginPointShape({ x: 10, y: 10 }, 'polyline')
    store.updateDraftPointShape({ x: 20, y: 20 })
    store.addDraftPoint({ x: 20, y: 20 })
    store.updateDraftPointShape({ x: 30, y: 25 })
    store.finishDraftPointShape()

    expect(firstShape(store.document.value).shapeType).toBe('polyline')
    expect(firstShape(store.document.value).points).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ])

    store.beginPointShape({ x: 100, y: 100 }, 'polygon')
    store.addDraftPoint({ x: 140, y: 100 })
    store.addDraftPoint({ x: 130, y: 130 })
    store.updateDraftPointShape({ x: 110, y: 130 })
    store.finishDraftPointShape()

    const polygon = store.document.value.nodes[1] as ShapeNode
    expect(polygon.shapeType).toBe('polygon')
    expect(polygon.points).toEqual([
      { x: 100, y: 100 },
      { x: 140, y: 100 },
      { x: 130, y: 130 },
    ])
  })
})
