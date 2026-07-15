<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PaletteColorSaveRequest,
  PaletteDetailResponse,
  PaletteSaveRequest,
  PaletteSummaryResponse,
} from '../api'
import { palettesApi } from '../api'

type PaletteFormColor = {
  name: string
  hex: string
}

type PaletteForm = {
  id?: number
  name: string
  description: string
  colors: PaletteFormColor[]
}

const palettes = ref<PaletteSummaryResponse[]>([])
const selectedPalette = ref<PaletteDetailResponse>()
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const form = reactive<PaletteForm>(createEmptyForm())

const isEditingExisting = computed(() => form.id !== undefined)
const canSave = computed(() => {
  return (
    form.name.trim().length > 0 &&
    form.colors.length > 0 &&
    form.colors.every((color) => color.name.trim() && isValidHex(color.hex)) &&
    new Set(form.colors.map((color) => color.name.trim().toLowerCase())).size === form.colors.length
  )
})

onMounted(() => {
  loadPalettes()
})

async function loadPalettes() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    palettes.value = await palettesApi.palettes_GetPalettes()
  } catch {
    errorMessage.value = 'Palettes could not be loaded.'
  } finally {
    isLoading.value = false
  }
}

async function selectPalette(id: number) {
  errorMessage.value = ''

  try {
    const palette = await palettesApi.palettes_GetPalette(id)
    selectedPalette.value = palette
    setFormFromPalette(palette)
  } catch {
    errorMessage.value = 'That palette could not be opened.'
  }
}

function startNewPalette() {
  selectedPalette.value = undefined
  resetForm(createEmptyForm())
}

function addColor() {
  form.colors.push({
    name: `Color ${form.colors.length + 1}`,
    hex: '#2F7D5A',
  })
}

function removeColor(index: number) {
  form.colors.splice(index, 1)
}

function moveColor(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= form.colors.length) {
    return
  }

  const [color] = form.colors.splice(index, 1)
  if (!color) {
    return
  }

  form.colors.splice(nextIndex, 0, color)
}

async function savePalette() {
  if (!canSave.value) {
    errorMessage.value = 'Give the palette a name and valid, uniquely named colors.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  const request = new PaletteSaveRequest({
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    colors: form.colors.map(
      (color) =>
        new PaletteColorSaveRequest({
          name: color.name.trim(),
          hex: normalizeHex(color.hex),
        }),
    ),
  })

  try {
    const saved = form.id
      ? await palettesApi.palettes_UpdatePalette(form.id, request)
      : await palettesApi.palettes_CreatePalette(request)

    selectedPalette.value = saved
    setFormFromPalette(saved)
    await loadPalettes()
  } catch {
    errorMessage.value = 'The palette could not be saved.'
  } finally {
    isSaving.value = false
  }
}

async function archivePalette() {
  if (!form.id) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    await palettesApi.palettes_ArchivePalette(form.id)
    startNewPalette()
    await loadPalettes()
  } catch {
    errorMessage.value = 'The palette could not be archived.'
  } finally {
    isSaving.value = false
  }
}

function setFormFromPalette(palette: PaletteDetailResponse) {
  resetForm({
    id: palette.id,
    name: palette.name ?? '',
    description: palette.description ?? '',
    colors:
      palette.colors?.map((color) => ({
        name: color.name ?? '',
        hex: color.hex ?? '#000000',
      })) ?? [],
  })
}

function resetForm(nextForm: PaletteForm) {
  form.id = nextForm.id
  form.name = nextForm.name
  form.description = nextForm.description
  form.colors = nextForm.colors
}

function createEmptyForm(): PaletteForm {
  return {
    name: '',
    description: '',
    colors: [
      { name: 'Ink', hex: '#1D2B24' },
      { name: 'Water', hex: '#4C91B6' },
      { name: 'Field', hex: '#88A85C' },
    ],
  }
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

function normalizeHex(value: string) {
  const trimmed = value.trim()
  return `#${trimmed.replace('#', '')}`.toUpperCase()
}
</script>

<template>
  <section class="palette-workspace" aria-labelledby="palette-heading">
    <header class="workspace-header">
      <div>
        <h1 id="palette-heading">Palettes</h1>
        <p>Build the color sets that cards will hand to tile editors.</p>
      </div>
      <button class="secondary-button" type="button" @click="startNewPalette">New palette</button>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

    <div class="palette-layout">
      <aside class="palette-list" aria-label="Saved palettes">
        <div v-if="isLoading" class="empty-state">Loading palettes...</div>
        <div v-else-if="palettes.length === 0" class="empty-state">No palettes yet.</div>
        <button
          v-for="palette in palettes"
          v-else
          :key="palette.id"
          class="palette-list-item"
          :class="{ selected: palette.id === form.id }"
          type="button"
          @click="selectPalette(palette.id!)"
        >
          <span>{{ palette.name }}</span>
          <span class="palette-strip" aria-hidden="true">
            <span
              v-for="color in palette.colors"
              :key="`${palette.id}-${color.id}-${color.hex}`"
              :style="{ background: color.hex }"
            ></span>
          </span>
        </button>
      </aside>

      <form class="palette-editor" @submit.prevent="savePalette">
        <div class="editor-panel-header">
          <h2>{{ isEditingExisting ? 'Edit palette' : 'Create palette' }}</h2>
          <div class="editor-actions">
            <button v-if="isEditingExisting" class="danger-button" type="button" :disabled="isSaving" @click="archivePalette">
              Archive
            </button>
            <button class="primary-button" type="submit" :disabled="isSaving || !canSave">
              {{ isSaving ? 'Saving' : 'Save palette' }}
            </button>
          </div>
        </div>

        <label>
          <span>Name</span>
          <input v-model="form.name" name="palette-name" required />
        </label>

        <label>
          <span>Description</span>
          <textarea v-model="form.description" name="palette-description" rows="3"></textarea>
        </label>

        <div class="color-editor-header">
          <h3>Colors</h3>
          <button class="secondary-button" type="button" @click="addColor">Add color</button>
        </div>

        <div class="color-rows">
          <div v-for="(color, index) in form.colors" :key="index" class="color-row">
            <span class="color-swatch" :style="{ background: isValidHex(color.hex) ? color.hex : '#ffffff' }"></span>
            <input v-model="color.name" :aria-label="`Color ${index + 1} name`" placeholder="Name" />
            <input v-model="color.hex" :aria-label="`Color ${index + 1} hex`" placeholder="#RRGGBB" />
            <button type="button" class="icon-button" :disabled="index === 0" title="Move up" @click="moveColor(index, -1)">
              Up
            </button>
            <button
              type="button"
              class="icon-button"
              :disabled="index === form.colors.length - 1"
              title="Move down"
              @click="moveColor(index, 1)"
            >
              Down
            </button>
            <button type="button" class="icon-button danger" title="Remove color" @click="removeColor(index)">Remove</button>
          </div>
        </div>

        <div class="palette-preview" aria-label="Palette preview">
          <span v-for="(color, index) in form.colors" :key="index" :style="{ background: color.hex }"></span>
        </div>
      </form>
    </div>
  </section>
</template>
