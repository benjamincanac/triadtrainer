<script setup lang="ts">
import { chordLabel, type Chord } from '~/composables/useTheory'
import type { Phase } from '~/composables/useTrainer'

defineProps<{
  chord: Chord | null
  phase: Phase
  verdict: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 text-center">
    <p class="font-mono text-[10px] tracking-[0.25em] text-legend uppercase">
      Play this chord
    </p>

    <p
      class="font-serif text-5xl leading-none italic transition-colors duration-200 sm:text-7xl"
      :class="{
        'text-ivory': phase === 'awaiting',
        'text-ok': phase === 'correct',
        'text-bad': phase === 'wrong'
      }"
    >
      {{ chord ? chordLabel(chord) : '—' }}
    </p>

    <!-- The lamps carry the verdict visually; this is the same information for
         a screen reader. -->
    <p
      aria-live="polite"
      aria-atomic="true"
      class="h-4 font-mono text-[11px] tracking-wide"
      :class="phase === 'correct' ? 'text-ok' : 'text-bad'"
    >
      {{ verdict }}
    </p>
  </div>
</template>
