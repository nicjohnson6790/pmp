import type { DrawingDocument, DrawingNode, FlattenedDrawingNode } from './drawingTypes'

export type ReorderDirection = 'up' | 'down'

export function flattenDrawingNodes(document: DrawingDocument): FlattenedDrawingNode[] {
  return flattenNodes(document.nodes, 0)
}

export function findDrawingNode(document: DrawingDocument, nodeId?: string): DrawingNode | undefined {
  if (!nodeId) {
    return undefined
  }

  return findNode(document.nodes, nodeId)
}

export function removeDrawingNode(document: DrawingDocument, nodeId?: string): boolean {
  if (!nodeId) {
    return false
  }

  return removeNode(document.nodes, nodeId)
}

export function renameDrawingNode(document: DrawingDocument, nodeId: string | undefined, name: string): boolean {
  const node = findDrawingNode(document, nodeId)
  if (!node) {
    return false
  }

  node.name = name
  return true
}

export function moveDrawingNode(document: DrawingDocument, nodeId: string | undefined, direction: ReorderDirection): boolean {
  if (!nodeId) {
    return false
  }

  const siblings = findSiblingList(document.nodes, nodeId)
  if (!siblings) {
    return false
  }

  const index = siblings.findIndex((node) => node.id === nodeId)
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) {
    return false
  }

  const [node] = siblings.splice(index, 1)
  if (!node) {
    return false
  }

  siblings.splice(nextIndex, 0, node)
  return true
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

function removeNode(nodes: DrawingNode[], nodeId: string): boolean {
  const index = nodes.findIndex((node) => node.id === nodeId)
  if (index >= 0) {
    nodes.splice(index, 1)
    return true
  }

  for (const node of nodes) {
    if (node.type === 'group' && removeNode(node.children, nodeId)) {
      return true
    }
  }

  return false
}

function findSiblingList(nodes: DrawingNode[], nodeId: string): DrawingNode[] | undefined {
  if (nodes.some((node) => node.id === nodeId)) {
    return nodes
  }

  for (const node of nodes) {
    if (node.type === 'group') {
      const childSiblings = findSiblingList(node.children, nodeId)
      if (childSiblings) {
        return childSiblings
      }
    }
  }

  return undefined
}
