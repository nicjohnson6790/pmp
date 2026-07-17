<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DrawingDocument, DrawingNode, FlattenedDrawingNode } from '../editor/drawingTypes'
import type { DropPosition, LayerMoveState } from '../editor/drawingTree'

const props = defineProps<{
  canGroupSelection: boolean
  canUngroupSelection: boolean
  document: DrawingDocument
  selectedNodeMoveState: LayerMoveState
  selectedNodeId?: string
}>()

const emit = defineEmits<{
  groupSelection: []
  moveIntoPreviousGroup: []
  moveNodeTo: [nodeId: string, targetNodeId: string, position: DropPosition]
  moveOutOfGroup: []
  rename: [nodeId: string, name: string]
  reorder: [nodeId: string, direction: 'up' | 'down']
  select: [nodeId: string]
  ungroupSelection: []
}>()

const collapsedGroupIds = ref(new Set<string>())
const draggedNodeId = ref<string>()
const dropTarget = ref<{
  nodeId: string
  position: DropPosition
}>()

const layers = computed(() => flattenVisibleNodes(props.document.nodes, 0))

function typeLabel(type: string) {
  return type === 'group' ? 'Group' : 'Shape'
}

function isCollapsed(nodeId: string) {
  return collapsedGroupIds.value.has(nodeId)
}

function toggleGroup(nodeId: string) {
  const nextCollapsedIds = new Set(collapsedGroupIds.value)
  if (nextCollapsedIds.has(nodeId)) {
    nextCollapsedIds.delete(nodeId)
  } else {
    nextCollapsedIds.add(nodeId)
  }

  collapsedGroupIds.value = nextCollapsedIds
}

function getCanMoveUp(nodeId: string) {
  return nodeId === props.selectedNodeId && props.selectedNodeMoveState.canMoveUp
}

function getCanMoveDown(nodeId: string) {
  return nodeId === props.selectedNodeId && props.selectedNodeMoveState.canMoveDown
}

function beginDrag(event: DragEvent, nodeId: string) {
  draggedNodeId.value = nodeId
  event.dataTransfer?.setData('text/plain', nodeId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function updateDropTarget(event: DragEvent, layer: FlattenedDrawingNode) {
  if (!draggedNodeId.value || draggedNodeId.value === layer.node.id) {
    dropTarget.value = undefined
    return
  }

  event.preventDefault()
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const offsetRatio = (event.clientY - bounds.top) / bounds.height
  let position: DropPosition = offsetRatio < 0.28 ? 'before' : 'after'
  if (layer.node.type === 'group' && offsetRatio >= 0.28 && offsetRatio <= 0.72) {
    position = 'inside'
  }

  dropTarget.value = {
    nodeId: layer.node.id,
    position,
  }
}

function finishDrop(event: DragEvent, targetNodeId: string) {
  event.preventDefault()
  const nodeId = draggedNodeId.value ?? event.dataTransfer?.getData('text/plain')
  const position = dropTarget.value?.nodeId === targetNodeId ? dropTarget.value.position : 'after'
  if (nodeId && nodeId !== targetNodeId) {
    emit('moveNodeTo', nodeId, targetNodeId, position)
  }

  draggedNodeId.value = undefined
  dropTarget.value = undefined
}

function clearDropTarget() {
  draggedNodeId.value = undefined
  dropTarget.value = undefined
}

function flattenVisibleNodes(nodes: DrawingNode[], depth: number): FlattenedDrawingNode[] {
  return nodes.flatMap((node) => {
    const current = { node, depth }
    if (node.type === 'shape' || isCollapsed(node.id)) {
      return [current]
    }

    return [current, ...flattenVisibleNodes(node.children, depth + 1)]
  })
}
</script>

<template>
  <aside class="layer-manager-panel" aria-label="Layers">
    <div class="layer-manager-header">
      <h2>Layers</h2>
      <div class="layer-structure-actions" aria-label="Layer structure">
        <button type="button" title="Group selected layer" :disabled="!canGroupSelection" @click="emit('groupSelection')">
          G
        </button>
        <button
          type="button"
          title="Ungroup selected group"
          :disabled="!canUngroupSelection"
          @click="emit('ungroupSelection')"
        >
          UG
        </button>
        <button
          type="button"
          title="Move selected layer into the group above"
          :disabled="!selectedNodeMoveState.canMoveIntoPreviousGroup"
          @click="emit('moveIntoPreviousGroup')"
        >
          In
        </button>
        <button
          type="button"
          title="Move selected layer out of its parent group"
          :disabled="!selectedNodeMoveState.canMoveOutOfGroup"
          @click="emit('moveOutOfGroup')"
        >
          Out
        </button>
      </div>
    </div>
    <div v-if="layers.length === 0" class="empty-state">No drawing layers yet.</div>
    <div v-else class="layer-list" role="listbox" aria-label="Drawing layers">
      <div
        v-for="layer in layers"
        :key="layer.node.id"
        class="layer-list-item"
        :class="{
          selected: layer.node.id === selectedNodeId,
          group: layer.node.type === 'group',
          'drop-before': dropTarget?.nodeId === layer.node.id && dropTarget.position === 'before',
          'drop-after': dropTarget?.nodeId === layer.node.id && dropTarget.position === 'after',
          'drop-inside': dropTarget?.nodeId === layer.node.id && dropTarget.position === 'inside',
        }"
        role="option"
        :aria-selected="layer.node.id === selectedNodeId"
        draggable="true"
        :style="{ paddingLeft: `${12 + layer.depth * 18}px` }"
        @click="emit('select', layer.node.id)"
        @dragstart="beginDrag($event, layer.node.id)"
        @dragover="updateDropTarget($event, layer)"
        @drop="finishDrop($event, layer.node.id)"
        @dragend="clearDropTarget"
      >
        <div class="layer-meta-row">
          <button
            v-if="layer.node.type === 'group'"
            class="layer-collapse-button"
            type="button"
            :title="isCollapsed(layer.node.id) ? 'Show group contents' : 'Hide group contents'"
            @click.stop="toggleGroup(layer.node.id)"
          >
            {{ isCollapsed(layer.node.id) ? '+' : '-' }}
          </button>
          <span v-else class="layer-collapse-spacer"></span>
          <span class="layer-type">{{ typeLabel(layer.node.type) }}</span>
          <span class="layer-reorder-actions" aria-label="Layer order">
            <button
              type="button"
              title="Move layer up"
              :disabled="!getCanMoveUp(layer.node.id)"
              @click.stop="emit('reorder', layer.node.id, 'up')"
            >
              ^
            </button>
            <button
              type="button"
              title="Move layer down"
              :disabled="!getCanMoveDown(layer.node.id)"
              @click.stop="emit('reorder', layer.node.id, 'down')"
            >
              v
            </button>
          </span>
        </div>
        <div class="layer-name-row">
          <input
            class="layer-name-input"
            :value="layer.node.name"
            :aria-label="`Rename ${layer.node.name}`"
            @click.stop="emit('select', layer.node.id)"
            @change="emit('rename', layer.node.id, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>
  </aside>
</template>
