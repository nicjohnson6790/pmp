<script setup lang="ts">
import { computed } from 'vue'
import type { DrawingDocument } from '../editor/drawingTypes'
import { flattenDrawingNodes } from '../editor/drawingTree'

const props = defineProps<{
  document: DrawingDocument
  selectedNodeId?: string
}>()

const emit = defineEmits<{
  select: [nodeId: string]
}>()

const layers = computed(() => flattenDrawingNodes(props.document))

function typeLabel(type: string) {
  return type === 'group' ? 'Group' : 'Shape'
}
</script>

<template>
  <aside class="layer-manager-panel" aria-label="Layers">
    <h2>Layers</h2>
    <div v-if="layers.length === 0" class="empty-state">No drawing layers yet.</div>
    <div v-else class="layer-list" role="listbox" aria-label="Drawing layers">
      <button
        v-for="layer in layers"
        :key="layer.node.id"
        class="layer-list-item"
        :class="{ selected: layer.node.id === selectedNodeId, group: layer.node.type === 'group' }"
        type="button"
        role="option"
        :aria-selected="layer.node.id === selectedNodeId"
        :style="{ paddingLeft: `${12 + layer.depth * 18}px` }"
        @click="emit('select', layer.node.id)"
      >
        <span class="layer-name">{{ layer.node.name }}</span>
        <span class="layer-type">{{ typeLabel(layer.node.type) }}</span>
      </button>
    </div>
  </aside>
</template>
