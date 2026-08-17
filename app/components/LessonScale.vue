<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '~/composables/useSettings'
import {
  chordLabel,
  chordPitchClasses,
  noteName,
  scale,
  scaleNotes,
  TRIAD_DEGREES,
  type Chord
} from '~/composables/useTheory'

const props = defineProps<{ chord: Chord }>()
const emit = defineEmits<{ play: [notes: number[]] }>()

const { settings } = useSettings()

const notes = computed(() => scaleNotes(props.chord.root, props.chord.quality, 60))

const degrees = computed(() => {
  const pitchClasses = scale(props.chord.root, props.chord.quality)
  const chordTones = new Set(chordPitchClasses(props.chord))
  return pitchClasses.map((pitchClass, index) => ({
    degree: index + 1,
    pitchClass,
    name: noteName(pitchClass, settings.value.accidentals),
    inChord: chordTones.has(pitchClass)
  }))
})

/** The relative major/minor shares all seven notes. */
const relative = computed<Chord>(() =>
  props.chord.quality === 'major'
    ? { root: (props.chord.root + 9) % 12, quality: 'minor' }
    : { root: (props.chord.root + 3) % 12, quality: 'major' }
)
</script>

<template>
  <section class="flex flex-col gap-3">
    <p class="max-w-prose text-xs leading-relaxed text-muted">
      The triad is degrees 1, 3 and 5 of its scale. Seeing where the chord sits in the
      seven notes is what makes it findable without counting semitones.
    </p>

    <div class="flex flex-col gap-3 rounded-lg border border-default bg-elevated p-3">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="font-mono text-xs text-highlighted">
          {{ noteName(chord.root, settings.accidentals) }} {{ chord.quality }} scale
        </h3>
        <button
          type="button"
          class="cursor-pointer font-mono text-[10px] text-primary underline-offset-4 hover:underline"
          @click="emit('play', notes)"
        >
          play ascending
        </button>
      </div>

      <MiniKeyboard
        :notes="notes"
        :roots="[60 + chord.root, 72 + chord.root]"
        :semitones="25"
        :labels="false"
        interactive
        height="h-16 sm:h-20"
        @press="emit('play', [$event])"
      />

      <ol class="flex flex-wrap gap-px overflow-hidden rounded border border-default">
        <li
          v-for="step in degrees"
          :key="step.degree"
          class="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2"
          :class="step.inChord ? 'bg-lamp/15' : 'bg-accented'"
        >
          <span
            class="font-mono text-[9px]"
            :class="step.inChord ? 'text-primary' : 'text-dimmed'"
          >{{ step.degree }}</span>
          <span
            class="font-mono text-[11px]"
            :class="step.inChord ? 'text-primary' : 'text-muted'"
          >{{ step.name }}</span>
        </li>
      </ol>

      <p class="text-[11px] leading-relaxed text-muted">
        Degrees {{ TRIAD_DEGREES.join(', ') }} highlighted make {{ chordLabel(chord, settings.accidentals) }}.
        The same seven notes spell {{ chordLabel(relative, settings.accidentals) }}, its relative
        {{ relative.quality }}.
      </p>
    </div>
  </section>
</template>
