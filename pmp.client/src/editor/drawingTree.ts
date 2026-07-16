import type { DrawingDocument, DrawingNode, FlattenedDrawingNode } from './drawingTypes'

export function flattenDrawingNodes(document: DrawingDocument): FlattenedDrawingNode[] {
  return flattenNodes(document.nodes, 0)
}

export function findDrawingNode(document: DrawingDocument, nodeId?: string): DrawingNode | undefined {
  if (!nodeId) {
    return undefined
  }

  return findNode(document.nodes, nodeId)
}

function flattenNodes(nodes: DrawingNode[], depth: number): FlattenedDrawingNode[] {
  return nodes.flatMap((node) => {
    const current = { node, depth }
    if (node.type === 'shape') {
      return [current]
    }

    return [current, ...flattenNodes(node.children, depth + 1)]
  })
}

function findNode(nodes: DrawingNode[], nodeId: string): DrawingNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    if (node.type === 'group') {
      const child = findNode(node.children, nodeId)
      if (child) {
        return child
      }
    }
  }

  return undefined
}
