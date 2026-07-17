<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DrawingDocument, DrawingNode, FlattenedDrawingNode } from '../editor/drawingTypes'

const props = defineProps<{
  document: DrawingDocument
  selectedNodeId?: string
}>()

const emit = defineEmits<{
  rename: [nodeId: string, name: string]
  reorder: [nodeId: string, direction: 'up' | 'down']
  select: [nodeId: string]
}>()

const collapsedGroupIds = ref(new Set<string>())

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
    <h2>Layers</h2>
    <div v-if="layers.length === 0" class="empty-state">No drawing layers yet.</div>
    <div v-else class="layer-list" role="listbox" aria-label="Drawing layers">
      <div
        v-for="layer in layers"
        :key="layer.node.id"
        class="layer-list-item"
        :class="{ selected: layer.node.id === selectedNodeId, group: layer.node.type === 'group' }"
        role="option"
        :aria-selected="layer.node.id === selectedNodeId"
        :style="{ paddingLeft: `${12 + layer.depth * 18}px` }"
        @click="emit('select', layer.node.id)"
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
            <button type="button" title="Move layer up" @click.stop="emit('reorder', layer.node.id, 'up')">^</button>
            <button type="button" title="Move layer down" @click.stop="emit('reorder', layer.node.id, 'down')">
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
