<script setup lang="ts">
import { computed } from 'vue'
import { tabOf, type Settings } from '~/composables/useSettings'
import { noteName } from '~/composables/useTheory'

const settings = defineModel<Settings>({ required: true })

/**
 * The panel only shows what the open tab reads. A switch that does nothing
 * where you are is worse than a missing one: it looks broken.
 */
const tab = computed(() => tabOf(settings.value))

/** What the pool is made of, so the two pool legends name the right thing. */
const subject = computed(() => tab.value === 'scales' ? 'Scale' : tab.value === 'notes' ? 'Note' : 'Chord')

const drawsChords = computed(() => tab.value === 'triads' || tab.value === 'scales' || tab.value === 'ear')
/** Explore has no prompt, so nothing below the keys is left to configure. */
const hasPrompt = computed(() => tab.value !== 'explore')

const QUALITIES = [
  { label: 'Major', value: 'major' },
  { label: 'Minor', value: 'minor' },
  { label: 'Both', value: 'both' }
]

/** One black key under each spelling, in whichever names are being used. */
const ACCIDENTALS = computed(() => [
  { label: noteName(1, 'sharps', settings.value.naming), value: 'sharps' },
  { label: noteName(1, 'flats', settings.value.naming), value: 'flats' },
  { label: 'Both', value: 'both' }
])

const NAMINGS = [
  { label: 'C D E', value: 'letters' },
  { label: 'Do Ré Mi', value: 'solfege' }
]

const ORDERS = [
  { label: 'Random', value: 'random' },
  { label: 'In order', value: 'sequential' }
]

const CLEFS = [
  { label: 'Treble', value: 'treble' },
  { label: 'Bass', value: 'bass' },
  { label: 'Both', value: 'both' }
]

const LINE_LENGTHS = [
  { label: '1', value: 1 },
  { label: '4', value: 4 },
  { label: '8', value: 8 }
]

const ALTERATIONS = [
  { label: 'None', value: 'none' },
  { label: '♭', value: 'flats' },
  { label: '♯', value: 'sharps' },
  { label: 'Both', value: 'both' }
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
const naming = field('naming')
const order = field('order')
const clef = field('clef')
const lineLength = field('lineLength')
const alterations = field('alterations')
const fingering = field('fingering')
const hideNames = field('hideNames')
const whiteRootsOnly = field('whiteRootsOnly')
const inversions = field('inversions')
const revealName = field('revealName')
const echoMidi = field('echoMidi')

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
  <UCard title="Settings" :ui="{ body: 'flex flex-col gap-3' }">
    <template v-if="hasPrompt">
      <URadioGroup
        v-if="drawsChords"
        v-model="quality"
        :items="QUALITIES"
        :legend="`${subject} types`"
        orientation="horizontal"
        :ui="RADIO_UI"
        variant="card"
        size="xs"
        indicator="hidden"
      />

      <!-- Both draws from either staff, so the clef has to be read too. -->
      <URadioGroup
        v-else
        v-model="clef"
        :items="CLEFS"
        legend="Clef"
        orientation="horizontal"
        :ui="RADIO_UI"
        variant="card"
        size="xs"
        indicator="hidden"
      />

      <!-- The signs written on the staff. How the key caps spell a black key is
           the Accidentals setting further down, and the two are independent. -->
      <URadioGroup
        v-if="tab === 'notes'"
        v-model="alterations"
        :items="ALTERATIONS"
        legend="Sharps and flats"
        orientation="horizontal"
        :ui="RADIO_UI"
        variant="card"
        size="xs"
        indicator="hidden"
      />

      <!-- More than one makes it a line to read through, played left to right. -->
      <URadioGroup
        v-if="tab === 'notes'"
        v-model="lineLength"
        :items="LINE_LENGTHS"
        legend="Notes per prompt"
        orientation="horizontal"
        :ui="RADIO_UI"
        variant="card"
        size="xs"
        indicator="hidden"
      />

      <URadioGroup
        v-model="order"
        :items="ORDERS"
        :legend="`${subject} order`"
        orientation="horizontal"
        :ui="RADIO_UI"
        variant="card"
        size="xs"
        indicator="hidden"
      />

      <!-- A single note has no hand position, so this only shows on a line. -->
      <USwitch v-if="tab === 'notes'" v-model="fingering" label="Show fingering" :ui="SWITCH_UI" />
      <USwitch v-if="drawsChords" v-model="whiteRootsOnly" label="White-key roots only" :ui="SWITCH_UI" />
      <!-- Ear training asks for the chord, never for a voicing. -->
      <USwitch v-if="tab === 'triads'" v-model="inversions" label="Ask for inversions" :ui="SWITCH_UI" />
      <!-- Only for a miss: a right answer is always named. -->
      <USwitch v-if="tab === 'ear'" v-model="revealName" label="Name the answer after a miss" :ui="SWITCH_UI" />

      <USeparator />
    </template>

    <!-- The keys themselves, which every tab plays on. -->
    <URadioGroup
      v-model="naming"
      :items="NAMINGS"
      legend="Note names"
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
    <!-- Turn it off on a digital piano, which is already making the sound. -->
    <USwitch v-model="echoMidi" label="Play MIDI notes" :ui="SWITCH_UI" />
  </UCard>
</template>
