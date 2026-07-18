import type { DrawingDocument, DrawingNode, FlattenedDrawingNode } from './drawingTypes'
import { identityTransform } from './drawingTypes'
import { getNodeWorldMatrix, setNodeWorldMatrix } from './drawingTransforms'

export type ReorderDirection = 'up' | 'down'
export type DropPosition = 'before' | 'after' | 'inside'

export type LayerMoveState = {
  canMoveUp: boolean
  canMoveDown: boolean
  canMoveIntoPreviousGroup: boolean
  canMoveOutOfGroup: boolean
}

export type DrawingNodeLocation = {
  node: DrawingNode
  siblings: DrawingNode[]
  index: number
  parents: DrawingNode[]
}

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

export function getLayerMoveState(document: DrawingDocument, nodeId: string | undefined): LayerMoveState {
  const location = findNodeLocation(document.nodes, nodeId)
  if (!location) {
    return {
      canMoveUp: false,
      canMoveDown: false,
      canMoveIntoPreviousGroup: false,
      canMoveOutOfGroup: false,
    }
  }

  const previousSibling = location.siblings[location.index - 1]
  return {
    canMoveUp: location.index > 0,
    canMoveDown: location.index < location.siblings.length - 1,
    canMoveIntoPreviousGroup: previousSibling?.type === 'group',
    canMoveOutOfGroup: location.parents.length > 0,
  }
}

export function moveDrawingNodeTo(
  document: DrawingDocument,
  nodeId: string | undefined,
  targetNodeId: string | undefined,
  position: DropPosition,
): boolean {
  if (!nodeId || !targetNodeId || nodeId === targetNodeId || isDescendantOf(document, targetNodeId, nodeId)) {
    return false
  }

  const source = findNodeLocation(document.nodes, nodeId)
  const target = findNodeLocation(document.nodes, targetNodeId)
  if (!source || !target) {
    return false
  }

  const targetSiblings = position === 'inside' && target.node.type === 'group' ? target.node.children : target.siblings
  const targetParents = position === 'inside' && target.node.type === 'group' ? [...target.parents, target.node] : target.parents
  const targetIndex = position === 'after' ? target.index + 1 : position === 'before' ? target.index : targetSiblings.length
  const sourceWorldMatrix = getNodeWorldMatrix(source.node, source.parents)

  const [node] = source.siblings.splice(source.index, 1)
  if (!node) {
    return false
  }

  let insertIndex = targetIndex
  if (source.siblings === targetSiblings && source.index < targetIndex) {
    insertIndex -= 1
  }

  targetSiblings.splice(Math.max(0, Math.min(insertIndex, targetSiblings.length)), 0, node)
  setNodeWorldMatrix(node, targetParents, sourceWorldMatrix)
  return true
}

export function moveDrawingNodeIntoPreviousGroup(document: DrawingDocument, nodeId: string | undefined): boolean {
  const location = findNodeLocation(document.nodes, nodeId)
  const previousSibling = location?.siblings[(location?.index ?? 0) - 1]
  if (!location || previousSibling?.type !== 'group') {
    return false
  }

  return moveDrawingNodeTo(document, location.node.id, previousSibling.id, 'inside')
}

export function moveDrawingNodeOutOfGroup(document: DrawingDocument, nodeId: string | undefined): boolean {
  const location = findNodeLocation(document.nodes, nodeId)
  const parent = location?.parents.at(-1)
  if (!location || !parent) {
    return false
  }

  return moveDrawingNodeTo(document, location.node.id, parent.id, 'after')
}

export function groupDrawingNode(document: DrawingDocument, nodeId: string | undefined): string | undefined {
  const location = findNodeLocation(document.nodes, nodeId)
  if (!location) {
    return undefined
  }

  const nodeWorldMatrix = getNodeWorldMatrix(location.node, location.parents)
  const [node] = location.siblings.splice(location.index, 1)
  if (!node) {
    return undefined
  }

  const group: DrawingNode = {
    id: `group-${Date.now()}-${node.id}`,
    type: 'group',
    name: `Group ${node.name}`,
    transform: identityTransform(),
    children: [node],
  }

  location.siblings.splice(location.index, 0, group)
  setNodeWorldMatrix(node, [...location.parents, group], nodeWorldMatrix)
  return group.id
}

export function ungroupDrawingNode(document: DrawingDocument, nodeId: string | undefined): string[] {
  const location = findNodeLocation(document.nodes, nodeId)
  if (!location || location.node.type !== 'group') {
    return []
  }

  const group = location.node
  const children = [...group.children]
  if (children.length === 0) {
    return []
  }

  const childWorldMatrices = children.map((child) => getNodeWorldMatrix(child, [...location.parents, group]))
  location.siblings.splice(location.index, 1, ...children)
  children.forEach((child, index) => setNodeWorldMatrix(child, location.parents, childWorldMatrices[index]!))
  return children.map((child) => child.id)
}

export function isGroupNode(document: DrawingDocument, nodeId: string | undefined): boolean {
  const node = findDrawingNode(document, nodeId)
  return node?.type === 'group'
}

export function findDrawingNodeLocation(
  document: DrawingDocument,
  nodeId: string | undefined,
): DrawingNodeLocation | undefined {
  return findNodeLocation(document.nodes, nodeId)
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

function findNodeLocation(
  nodes: DrawingNode[],
  nodeId: string | undefined,
  parents: DrawingNode[] = [],
): DrawingNodeLocation | undefined {
  if (!nodeId) {
    return undefined
  }

  const index = nodes.findIndex((node) => node.id === nodeId)
  if (index >= 0) {
    return {
      node: nodes[index]!,
      siblings: nodes,
      index,
      parents,
    }
  }

  for (const node of nodes) {
    if (node.type === 'group') {
      const childLocation = findNodeLocation(node.children, nodeId, [...parents, node])
      if (childLocation) {
        return childLocation
      }
    }
  }

  return undefined
}

function isDescendantOf(document: DrawingDocument, nodeId: string, possibleAncestorId: string): boolean {
  const ancestor = findDrawingNode(document, possibleAncestorId)
  return ancestor?.type === 'group' ? Boolean(findNode(ancestor.children, nodeId)) : false
}
