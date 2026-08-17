<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '~/composables/useSettings'
import {
  chordLabel,
  chordPitchClasses,
  noteName,
  rootsInFamily,
  SHAPE_FAMILIES,
  triad,
  type Quality,
  type ShapeFamily
} from '~/composables/useTheory'

const props = defineProps<{ quality: Quality }>()
const emit = defineEmits<{ play: [notes: number[]] }>()

const { settings } = useSettings()

const COPY: Record<ShapeFamily, { title: string, blurb: string }> = {
  WWW: {
    title: 'Three whites',
    blurb: 'Root, third and fifth all land on white keys. The hand sits flat.'
  },
  WBW: {
    title: 'White black white',
    blurb: 'Only the middle finger lifts onto a black key.'
  },
  BWB: {
    title: 'Black white black',
    blurb: 'The outer fingers ride the black keys, the thumb-side note stays down.'
  },
  irregular: {
    title: 'The three odd ones',
    blurb: 'No shared shape. These are the three worth drilling on their own.'
  }
}

const families = computed(() =>
  SHAPE_FAMILIES.map(family => {
    const roots = rootsInFamily(family, props.quality)
    const example = roots[0]!
    return {
      family,
      ...COPY[family],
      roots,
      rootNames: roots.map(root => noteName(root, settings.value.accidentals)),
      example: { root: example, quality: props.quality },
      exampleNotes: triad(example, props.quality),
      exampleNames: chordPitchClasses({ root: example, quality: props.quality })
        .map(pitchClass => noteName(pitchClass, settings.value.accidentals))
    }
  })
)

/** Sound the example an octave above middle C. */
function play(root: number) {
  const intervals = props.quality === 'major' ? [0, 4, 7] : [0, 3, 7]
  emit('play', intervals.map(interval => 60 + root + interval))
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <p class="max-w-prose text-xs leading-relaxed text-muted">
      Nine of the twelve {{ quality }} triads are the same gesture moved around the keyboard.
      Learn the four groups instead of twelve chords. Tap a diagram to hear it.
    </p>

    <div class="grid gap-2.5 sm:grid-cols-2">
      <article
        v-for="group in families"
        :key="group.family"
        class="flex flex-col gap-2 rounded-lg border border-default bg-elevated p-3"
      >
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="font-mono text-xs tracking-wide text-highlighted">
            {{ group.title }}
          </h3>
          <span class="font-mono text-[10px] text-primary">
            {{ group.rootNames.join(' · ') }}
          </span>
        </div>

        <button
          type="button"
          class="cursor-pointer rounded"
          :aria-label="`Play ${chordLabel(group.example, settings.accidentals)}`"
          @click="play(group.example.root)"
        >
          <!-- Exactly one octave, so the root lights once and the shape reads
               as a single hand position. -->
          <MiniKeyboard
            :notes="group.exampleNotes"
            :roots="[group.example.root]"
            :semitones="12"
            by-pitch-class
            :labels="false"
            height="h-14"
          />
        </button>

        <p class="text-[11px] leading-relaxed text-muted">
          {{ group.blurb }}
        </p>

        <p class="font-mono text-[10px] text-dimmed">
          e.g. {{ chordLabel(group.example, settings.accidentals) }} = {{ group.exampleNames.join(' ') }}
        </p>
      </article>
    </div>
  </section>
</template>
