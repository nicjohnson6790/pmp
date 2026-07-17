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

  it('renames and reorders layers with undo support', () => {
    const store = useDrawingDocument({
      ...emptyDocument(),
      nodes: [
        firstShape(circleDocument()),
        {
          ...firstShape(circleDocument()),
          id: 'circle-2',
          name: 'Circle 2',
        },
      ],
    })

    store.renameNode('circle-1', 'Town green')
    expect(store.document.value.nodes[0]?.name).toBe('Town green')

    store.reorderNode('circle-1', 'down')
    expect(store.document.value.nodes.map((node) => node.id)).toEqual(['circle-2', 'circle-1'])

    store.undo()
    expect(store.document.value.nodes.map((node) => node.id)).toEqual(['circle-1', 'circle-2'])

    store.undo()
    expect(store.document.value.nodes[0]?.name).toBe('Circle 1')
  })

  it('updates selected shape style and text content with undo support', () => {
    const store = useDrawingDocument(circleDocument())

    store.selectNode('circle-1')
    store.updateSelectedShapeStyle({ fill: '#111111', stroke: '#222222', strokeWidth: 12 })

    expect(firstShape(store.document.value).style).toEqual({
      fill: '#111111',
      stroke: '#222222',
      strokeWidth: 12,
    })

    store.undo()
    expect(firstShape(store.document.value).style.strokeWidth).toBe(8)

    store.createText({ x: 50, y: 80 })
    store.updateSelectedText('Harbor')
    store.updateSelectedTextOptions({ fontFamily: 'sans-serif', fontWeight: '400', textAlign: 'center' })
    const textShape = store.document.value.nodes[1] as ShapeNode
    expect(textShape.shapeType).toBe('text')
    expect(textShape.text).toBe('Harbor')
    expect(textShape.fontFamily).toBe('sans-serif')
    expect(textShape.fontWeight).toBe('400')
    expect(textShape.textAlign).toBe('center')

    store.undo()
    expect((store.document.value.nodes[1] as ShapeNode).textAlign).toBe('left')

    store.undo()
    expect((store.document.value.nodes[1] as ShapeNode).text).toBe('Text')
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

  it('creates brush and text shapes', () => {
    const store = useDrawingDocument(emptyDocument())

    store.beginBrush({ x: 10, y: 10 })
    store.updateDraftBrush({ x: 18, y: 14 })
    store.updateDraftBrush({ x: 30, y: 20 })
    store.finishDraftBrush()

    expect(firstShape(store.document.value).shapeType).toBe('brush')
    expect(firstShape(store.document.value).points.length).toBeGreaterThan(1)

    store.createText({ x: 120, y: 160 })
    const textShape = store.document.value.nodes[1] as ShapeNode
    expect(textShape.shapeType).toBe('text')
    expect(textShape.points).toEqual([
      { x: 120, y: 160 },
      { x: 120, y: 88 },
    ])
  })

  it('groups, ungroups, and moves layers through nested structure with undo support', () => {
    const store = useDrawingDocument({
      ...emptyDocument(),
      nodes: [
        firstShape(circleDocument()),
        {
          ...firstShape(circleDocument()),
          id: 'circle-2',
          name: 'Circle 2',
        },
      ],
    })

    store.selectNode('circle-1')
    store.groupSelectedNode()

    expect(store.document.value.nodes[0]?.type).toBe('group')
    expect(store.canUngroupSelection.value).toBe(true)

    store.selectNode('circle-2')
    expect(store.selectedNodeMoveState.value.canMoveIntoPreviousGroup).toBe(true)
    store.moveSelectedIntoPreviousGroup()

    const group = store.document.value.nodes[0]
    expect(group?.type).toBe('group')
    expect(group?.type === 'group' ? group.children.map((node) => node.id) : []).toEqual(['circle-1', 'circle-2'])

    store.undo()
    expect(store.document.value.nodes.map((node) => node.id)).toEqual([store.document.value.nodes[0]!.id, 'circle-2'])

    store.selectNode(store.document.value.nodes[0]!.id)
    store.ungroupSelectedNode()
    expect(store.document.value.nodes.map((node) => node.id)).toEqual(['circle-1', 'circle-2'])
  })

  it('preserves world transform when moving a layer out of a transformed group', () => {
    const store = useDrawingDocument({
      ...emptyDocument(),
      nodes: [
        {
          id: 'group-1',
          type: 'group',
          name: 'Group 1',
          transform: {
            x: 80,
            y: 40,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          children: [
            {
              ...firstShape(circleDocument()),
              transform: {
                x: 12,
                y: 18,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
              },
            },
          ],
        },
      ],
    })

    store.selectNode('circle-1')
    store.moveSelectedOutOfGroup()

    const movedNode = store.document.value.nodes[1] as ShapeNode
    expect(movedNode.id).toBe('circle-1')
    expect(movedNode.transform.x).toBe(92)
    expect(movedNode.transform.y).toBe(58)
  })
})
