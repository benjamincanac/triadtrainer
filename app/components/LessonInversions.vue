<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '~/composables/useSettings'
import { chordLabel, inversions, noteName, toPitchClass, type Chord } from '~/composables/useTheory'

const props = defineProps<{ chord: Chord }>()
const emit = defineEmits<{ play: [notes: number[]] }>()

const { settings } = useSettings()

const COPY = {
  root: 'Root position — the root is at the bottom and the chord is stacked in thirds.',
  first: 'First inversion — the root jumps up an octave, the third takes the bass.',
  second: 'Second inversion — the fifth is at the bottom, the root sits in the middle.'
} as const

const voicings = computed(() =>
  inversions(props.chord, 60).map(inversion => ({
    ...inversion,
    blurb: COPY[inversion.name],
    names: inversion.notes.map(note => noteName(toPitchClass(note), settings.value.accidentals))
  }))
)
</script>

<template>
  <section class="flex flex-col gap-3">
    <p class="max-w-prose font-sans text-xs leading-relaxed text-muted">
      Same three notes, three stacking orders. The drill accepts all of them, because
      {{ chordLabel(chord, settings.accidentals) }} is a set of pitch classes, not a fingering.
    </p>

    <div class="flex flex-col gap-2.5">
      <article
        v-for="voicing in voicings"
        :key="voicing.name"
        class="grid gap-2.5 rounded-lg border border-default bg-elevated p-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-baseline gap-2">
            <h3 class="font-mono text-xs text-highlighted capitalize">
              {{ voicing.name }}
            </h3>
            <span class="font-mono text-[10px] text-muted">
              {{ voicing.bass }} in bass
            </span>
          </div>
          <p class="font-mono text-[11px] text-primary">
            {{ voicing.names.join(' ') }}
          </p>
          <p class="font-sans text-[11px] leading-relaxed text-muted">
            {{ voicing.blurb }}
          </p>
        </div>

        <button
          type="button"
          class="cursor-pointer rounded"
          :aria-label="`Play ${chordLabel(chord, settings.accidentals)} in ${voicing.name} position`"
          @click="emit('play', voicing.notes)"
        >
          <!-- 28 semitones from C4 reaches MIDI 87, the top note of the highest
               second inversion (B major), so no voicing runs off the end. -->
          <MiniKeyboard
            :notes="voicing.notes"
            :roots="[60 + chord.root, 72 + chord.root]"
            :semitones="28"
            :labels="false"
            height="h-16"
          />
        </button>
      </article>
    </div>
  </section>
</template>
