<script setup lang="ts">
import { computed } from 'vue'
import type { Settings } from '~/composables/useSettings'

const settings = defineModel<Settings>({ required: true })

const QUALITIES = [
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' },
  { label: 'Both', value: 'both' }
]

const ACCIDENTALS = [
  { label: 'C#', value: 'sharps' },
  { label: 'Db', value: 'flats' }
]

// SEGMENT_UI is auto-imported from app/utils/segment.ts: these are choices, not
// panels, so they stay radio groups and only borrow the segmented look.

function field<K extends keyof Settings>(key: K) {
  return computed({
    get: () => settings.value[key],
    set: (value: Settings[K]) => {
      // A card radio can emit null when re-clicking the active item; the drill
      // always needs a value, so an empty selection keeps the old one.
      if (value !== null && value !== undefined) {
        settings.value = { ...settings.value, [key]: value }
      }
    }
  })
}

const quality = field('quality')
const accidentals = field('accidentals')
const hideNames = field('hideNames')
const whiteRootsOnly = field('whiteRootsOnly')
</script>

<template>
  <section class="flex flex-col gap-5 rounded-lg border border-etch bg-panel p-4">
    <h2 class="font-mono text-[10px] tracking-[0.18em] text-legend uppercase">
      Settings
    </h2>

    <URadioGroup
      v-model="quality"
      :items="QUALITIES"
      orientation="horizontal"
      variant="card"
      indicator="hidden"
      :ui="SEGMENT_UI"
      legend="Chord types"
    />

    <URadioGroup
      v-model="accidentals"
      :items="ACCIDENTALS"
      orientation="horizontal"
      variant="card"
      indicator="hidden"
      :ui="SEGMENT_UI"
      legend="Accidentals"
    />

    <USwitch
      v-model="hideNames"
      label="Hide note names"
      :ui="{
        root: 'flex-row-reverse items-center justify-between',
        label: 'font-mono text-[11px] font-normal text-legend'
      }"
    />

    <USwitch
      v-model="whiteRootsOnly"
      label="White-key roots only"
      :ui="{
        root: 'flex-row-reverse items-center justify-between',
        label: 'font-mono text-[11px] font-normal text-legend'
      }"
    />

    <p class="font-mono text-[10px] leading-relaxed text-legend/70">
      Press <UKbd value="space" size="sm" /> to skip to the next chord.
    </p>
  </section>
</template>
