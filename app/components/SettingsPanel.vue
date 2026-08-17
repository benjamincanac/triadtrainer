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

const ORDERS = [
  { label: 'Random', value: 'random' },
  { label: 'In order', value: 'sequential' }
]

function field<K extends keyof Settings>(key: K) {
  return computed({
    get: () => settings.value[key],
    set: (value: Settings[K]) => {
      settings.value = { ...settings.value, [key]: value }
    }
  })
}

const quality = field('quality')
const accidentals = field('accidentals')
const order = field('order')
const hideNames = field('hideNames')
const whiteRootsOnly = field('whiteRootsOnly')

/** Typography only — the layout is the component's own. */
const RADIO_UI = {
  legend: 'mb-1.5 font-mono text-[11px] font-normal text-muted',
  label: 'font-mono text-[11px]'
} as const

const SWITCH_UI = {
  root: 'flex-row-reverse items-center justify-between',
  wrapper: 'ms-0 me-2',
  label: 'font-mono text-[11px] font-normal text-muted'
} as const
</script>

<template>
  <UCard title="Settings" :ui="{ body: 'flex flex-col gap-2' }">
    <URadioGroup
      v-model="quality"
      :items="QUALITIES"
      legend="Chord types"
      orientation="horizontal"
      :ui="RADIO_UI"
      variant="card"
      size="xs"
      indicator="hidden"
    />

    <URadioGroup
      v-model="order"
      :items="ORDERS"
      legend="Chord order"
      orientation="horizontal"
      :ui="RADIO_UI"
      variant="card"
      size="xs"
      indicator="hidden"
    />

    <URadioGroup
      v-model="accidentals"
      :items="ACCIDENTALS"
      legend="Accidentals"
      orientation="horizontal"
      :ui="RADIO_UI"
      variant="card"
      size="xs"
      indicator="hidden"
    />

    <USwitch v-model="hideNames" label="Hide note names" :ui="SWITCH_UI" />
    <USwitch v-model="whiteRootsOnly" label="White-key roots only" :ui="SWITCH_UI" />
  </UCard>
</template>
