<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMidi } from '~/composables/useMidi'
import { useSettings } from '~/composables/useSettings'
import {
  chordLabel,
  fingering,
  identifyTriad,
  noteName,
  toPitchClass
} from '~/composables/useTheory'
import type { LampState } from '~/composables/useTrainer'

const emit = defineEmits<{ play: [notes: number[]] }>()

const { settings } = useSettings()

/**
 * Clicked keys latch, MIDI notes are transient, and the union is what gets
 * named. Actual MIDI numbers are kept rather than pitch classes, because the
 * lowest note is what tells us the inversion.
 */
const clicked = ref<Set<number>>(new Set())

const midi = useMidi(note => emit('play', [note]))

onMounted(() => void midi.start())

const held = computed(() => {
  const notes = new Set(clicked.value)
  for (const note of midi.heldNotes.value) notes.add(note)
  return notes
})

const identified = computed(() => identifyTriad(held.value))

const selectedPitchClasses = computed(() => {
  const set = new Set<number>()
  for (const note of held.value) set.add(toPitchClass(note))
  return set
})

const heldNames = computed(() =>
  [...held.value]
    .sort((a, b) => a - b)
    .map(note => noteName(toPitchClass(note), settings.value.accidentals))
)

/** Amber while you build it, green once it spells one of the 24. */
function lampFor(pitchClass: number): LampState {
  if (!selectedPitchClasses.value.has(pitchClass)) return 'off'
  return identified.value ? 'correct' : 'selected'
}

function pressKey(midiNote: number) {
  emit('play', [midiNote])
  const next = new Set(clicked.value)
  if (next.has(midiNote)) next.delete(midiNote)
  else next.add(midiNote)
  clicked.value = next
}

function clear() {
  clicked.value = new Set()
  midi.clearHeld()
}

const fingers = computed(() => {
  const found = identified.value
  if (!found) return undefined
  const f = fingering(found.inversion)
  return Object.fromEntries(
    [...held.value].sort((a, b) => a - b).map((note, i) => [note, {
      right: f.right[i]!,
      left: f.left[i]!
    }])
  )
})
</script>

<template>
  <section class="flex flex-col gap-3">
    <p class="max-w-prose font-sans text-xs leading-relaxed text-muted">
      Play anything, on the MIDI keyboard or by clicking, and it gets named. Three notes that
      spell one of the 24 triads light green and show their fingering. Clicks latch, so you can
      build a chord one note at a time.
    </p>

    <div class="flex flex-col gap-3 rounded-lg border border-default bg-elevated p-3">
      <div class="flex min-h-14 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div class="flex flex-col gap-1">
          <p
            class="font-serif text-3xl leading-none italic"
            :class="identified ? 'text-ok' : 'text-muted'"
            aria-live="polite"
          >
            {{ identified ? chordLabel(identified.chord, settings.accidentals) : (held.size ? 'Not a triad' : 'Play something') }}
          </p>
          <p class="font-mono text-[11px] text-muted">
            <span v-if="identified">
              {{ identified.inversion }} position
              <span class="px-1 opacity-40">·</span>
              R {{ fingering(identified.inversion).right.join('-') }}
              <span class="px-1 opacity-40">·</span>
              L {{ fingering(identified.inversion).left.join('-') }}
            </span>
            <span v-else-if="held.size">
              {{ held.size }} {{ held.size === 1 ? 'note' : 'notes' }} held, three make a triad
            </span>
            <span v-else class="opacity-0">placeholder</span>
          </p>
        </div>

        <div class="flex items-center gap-3">
          <p class="font-mono text-[11px] text-primary">
            {{ heldNames.join(' ') }}
          </p>
          <UButton
            v-if="held.size"
            color="neutral"
            variant="ghost"
            size="xs"
            label="Clear"
            class="font-mono text-[10px]"
            @click="clear"
          />
        </div>
      </div>

      <PianoKeyboard
        :lamp-for="lampFor"
        :selected="selectedPitchClasses"
        :show-labels="!settings.hideNames"
        :fingers="fingers"
        @press="pressKey"
      />

      <MidiStatus
        :state="midi.state.value"
        :inputs="midi.inputs.value"
        :selected-id="midi.selectedId.value"
        class="border-0 bg-transparent p-0"
        @select="midi.selectInput"
      />
    </div>
  </section>
</template>
