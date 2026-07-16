<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  CardDetailResponse,
  CardSaveRequest,
  CardSummaryResponse,
  PaletteSummaryResponse,
} from '../api'
import { cardsApi, palettesApi } from '../api'

const actionOptions = [
  { value: 'normal', label: 'Normal edit' },
  { value: 'shuffleDeck', label: 'Shuffle deck' },
  { value: 'createTile', label: 'Create tile' },
  { value: 'createCard', label: 'Create card' },
] as const

type CardForm = {
  id?: number
  title: string
  prompt: string
  paletteId?: number
  skipNumber: number
  hintNumber: number
  actionType: string
  deckOrder: number
}

const cards = ref<CardSummaryResponse[]>([])
const palettes = ref<PaletteSummaryResponse[]>([])
const selectedCard = ref<CardDetailResponse>()
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const form = reactive<CardForm>(createEmptyForm())

const isEditingExisting = computed(() => form.id !== undefined)
const selectedPalette = computed(() => palettes.value.find((palette) => palette.id === form.paletteId))
const canSave = computed(() => {
  return (
    form.title.trim().length > 0 &&
    form.prompt.trim().length > 0 &&
    !!form.paletteId &&
    form.skipNumber >= 1 &&
    form.skipNumber <= 9 &&
    form.hintNumber >= 1 &&
    form.hintNumber <= 9 &&
    form.deckOrder >= 0 &&
    actionOptions.some((option) => option.value === form.actionType)
  )
})

onMounted(() => {
  loadWorkspace()
})

async function loadWorkspace() {
  isLoading.value = true
  errorMessage.value = ''

  const [cardsResult, palettesResult] = await Promise.allSettled([
    cardsApi.cards_GetCards(),
    palettesApi.palettes_GetPalettes(),
  ])

  if (cardsResult.status === 'fulfilled') {
    cards.value = cardsResult.value
  } else {
    cards.value = []
    errorMessage.value = 'Cards could not be loaded.'
  }

  if (palettesResult.status === 'fulfilled') {
    palettes.value = palettesResult.value
    if (!form.paletteId && palettes.value[0]?.id) {
      form.paletteId = palettes.value[0].id
    }
  } else {
    palettes.value = []
    errorMessage.value = errorMessage.value
      ? `${errorMessage.value} Palettes could not be loaded.`
      : 'Palettes could not be loaded.'
  }

  isLoading.value = false
}

async function selectCard(id: number) {
  errorMessage.value = ''

  try {
    const card = await cardsApi.cards_GetCard(id)
    selectedCard.value = card
    setFormFromCard(card)
  } catch {
    errorMessage.value = 'That card could not be opened.'
  }
}

function startNewCard() {
  selectedCard.value = undefined
  resetForm(createEmptyForm())

  if (!form.paletteId && palettes.value[0]?.id) {
    form.paletteId = palettes.value[0].id
  }
}

async function saveCard() {
  if (!canSave.value || !form.paletteId) {
    errorMessage.value = 'Give the card a title, prompt, palette, valid numbers, and action.'
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  const request = new CardSaveRequest({
    title: form.title.trim(),
    prompt: form.prompt.trim(),
    paletteId: form.paletteId,
    skipNumber: form.skipNumber,
    hintNumber: form.hintNumber,
    actionType: form.actionType,
    deckOrder: form.deckOrder,
  })

  let saved: CardDetailResponse | undefined
  try {
    saved = form.id
      ? await cardsApi.cards_UpdateCard(form.id, request)
      : await cardsApi.cards_CreateCard(request)
  } catch {
    errorMessage.value = 'The card could not be saved.'
    return
  } finally {
    isSaving.value = false
  }

  selectedCard.value = saved
  setFormFromCard(saved)
  await loadWorkspace()
}

async function archiveCard() {
  if (!form.id) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    await cardsApi.cards_ArchiveCard(form.id)
    startNewCard()
  } catch {
    errorMessage.value = 'The card could not be archived.'
    return
  } finally {
    isSaving.value = false
  }

  await loadWorkspace()
}

function setFormFromCard(card: CardDetailResponse) {
  resetForm({
    id: card.id,
    title: card.title ?? '',
    prompt: card.prompt ?? '',
    paletteId: card.paletteId,
    skipNumber: card.skipNumber ?? 1,
    hintNumber: card.hintNumber ?? 1,
    actionType: card.actionType ?? 'normal',
    deckOrder: card.deckOrder ?? 0,
  })
}

function resetForm(nextForm: CardForm) {
  form.id = nextForm.id
  form.title = nextForm.title
  form.prompt = nextForm.prompt
  form.paletteId = nextForm.paletteId
  form.skipNumber = nextForm.skipNumber
  form.hintNumber = nextForm.hintNumber
  form.actionType = nextForm.actionType
  form.deckOrder = nextForm.deckOrder
}

function createEmptyForm(): CardForm {
  return {
    title: '',
    prompt: '',
    paletteId: undefined,
    skipNumber: 1,
    hintNumber: 1,
    actionType: 'normal',
    deckOrder: cards.value.length,
  }
}

function actionLabel(value?: string) {
  return actionOptions.find((option) => option.value === value)?.label ?? 'Unknown action'
}
</script>

<template>
  <section class="card-workspace" aria-labelledby="card-heading">
    <header class="workspace-header">
      <div>
        <h1 id="card-heading">Cards</h1>
        <p>Write prompts that pair map edits with palettes, numbers, and deck actions.</p>
      </div>
      <button class="secondary-button" type="button" @click="startNewCard">New card</button>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

    <div v-if="palettes.length === 0 && !isLoading" class="empty-state panel-empty">
      Create a palette before adding cards.
    </div>

    <div class="card-layout">
      <aside class="card-list" aria-label="Saved cards">
        <div v-if="isLoading" class="empty-state">Loading cards...</div>
        <div v-else-if="cards.length === 0" class="empty-state">No cards yet.</div>
        <button
          v-for="card in cards"
          v-else
          :key="card.id"
          class="card-list-item"
          :class="{ selected: card.id === form.id }"
          type="button"
          @click="selectCard(card.id!)"
        >
          <span class="card-list-title">{{ card.title }}</span>
          <span class="card-list-meta">
            {{ actionLabel(card.actionType) }} - Skip {{ card.skipNumber }} - Hint {{ card.hintNumber }}
          </span>
          <span class="palette-strip" aria-hidden="true">
            <span
              v-for="color in card.palette?.colors"
              :key="`${card.id}-${color.id}-${color.hex}`"
              :style="{ background: color.hex }"
            ></span>
          </span>
        </button>
      </aside>

      <form class="card-editor" @submit.prevent="saveCard">
        <div class="editor-panel-header">
          <h2>{{ isEditingExisting ? 'Edit card' : 'Create card' }}</h2>
          <div class="editor-actions">
            <button v-if="isEditingExisting" class="danger-button" type="button" :disabled="isSaving" @click="archiveCard">
              Archive
            </button>
            <button class="primary-button" :class="{ busy: isSaving }" type="submit" :disabled="isSaving || palettes.length === 0">
              {{ isSaving ? 'Saving' : 'Save card' }}
            </button>
          </div>
        </div>

        <div class="card-form-grid">
          <label>
            <span>Title</span>
            <input v-model="form.title" name="card-title" required />
          </label>

          <label>
            <span>Palette</span>
            <select v-model.number="form.paletteId" name="card-palette" required>
              <option v-for="palette in palettes" :key="palette.id" :value="palette.id">
                {{ palette.name }}
              </option>
            </select>
          </label>

          <label>
            <span>Skip number</span>
            <input v-model.number="form.skipNumber" name="skip-number" type="number" min="1" max="9" required />
          </label>

          <label>
            <span>Hint number</span>
            <input v-model.number="form.hintNumber" name="hint-number" type="number" min="1" max="9" required />
          </label>

          <label>
            <span>Action</span>
            <select v-model="form.actionType" name="card-action" required>
              <option v-for="option in actionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Deck order</span>
            <input v-model.number="form.deckOrder" name="deck-order" type="number" min="0" required />
          </label>
        </div>

        <label>
          <span>Prompt</span>
          <textarea v-model="form.prompt" name="card-prompt" rows="5" required></textarea>
        </label>

        <section class="card-preview" aria-label="Card preview">
          <div class="card-preview-header">
            <span>{{ actionLabel(form.actionType) }}</span>
            <span>Skip {{ form.skipNumber }} / Hint {{ form.hintNumber }}</span>
          </div>
          <h3>{{ form.title || 'Untitled card' }}</h3>
          <p>{{ form.prompt || 'The card prompt will appear here.' }}</p>
          <div class="palette-strip" aria-label="Selected palette preview">
            <span
              v-for="color in selectedPalette?.colors"
              :key="`${selectedPalette?.id}-${color.id}-${color.hex}`"
              :style="{ background: color.hex }"
            ></span>
          </div>
        </section>
      </form>
    </div>
  </section>
</template>
