<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { chordLabel, inversionLabel, type Chord, type InversionName } from '~/composables/useTheory'
import type { Phase } from '~/composables/useTrainer'

defineProps<{
  chord: Chord | null
  phase: Phase
  verdict: string
  /** Null when any voicing counts, which is the default drill. */
  inversion?: InversionName | null
}>()

const { settings } = useSettings()
</script>

<template>
  <div class="flex flex-col items-center gap-3 text-center">
    <p class="font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
      Practice this chord
    </p>

    <p
      class="font-serif text-[clamp(2.75rem,min(11vw,8vh),4.5rem)] leading-none italic transition-colors duration-200"
      :class="{
        'text-highlighted': phase === 'awaiting' || phase === 'revealed',
        'text-ok': phase === 'correct',
        'text-bad': phase === 'wrong'
      }"
    >
      {{ chord ? chordLabel(chord, settings.accidentals) : '—' }}
    </p>

    <!-- Part of the ask, not a note about it: amber is what this app uses for
         the thing being demanded. -->
    <p
      v-if="inversion"
      class="font-mono text-[11px] tracking-[0.18em] text-primary uppercase"
    >
      {{ inversionLabel(inversion) }}
    </p>

    <!-- The lamps carry the verdict visually; this is the same information for
         a screen reader. -->
    <p
      aria-live="polite"
      aria-atomic="true"
      class="h-4 font-mono text-[11px] tracking-wide"
      :class="{
        'text-ok': phase === 'correct',
        'text-bad': phase === 'wrong',
        'text-primary': phase === 'revealed'
      }"
    >
      {{ verdict }}
    </p>
  </div>
</template>
