<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import { chordLabel, type Chord } from '~/composables/useTheory'
import type { Phase } from '~/composables/useTrainer'

defineProps<{
  chord: Chord | null
  phase: Phase
  verdict: string
}>()

const { settings } = useSettings()
</script>

<template>
  <!-- Same three rows as the drill prompt, so switching modes doesn't move the
       keyboard up or down the page. -->
  <div class="flex flex-col items-center gap-3 text-center">
    <p class="font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
      Play what you hear
    </p>

    <p
      class="font-serif text-5xl leading-none italic transition-colors duration-200 sm:text-7xl"
      :class="{
        'text-muted': phase === 'awaiting',
        'text-ok': phase === 'correct',
        'text-bad': phase === 'wrong'
      }"
    >
      <!-- Withheld until it's answered, then named: putting the sound and the
           name together is the half of this that actually teaches. -->
      {{ phase === 'awaiting' || !chord ? '?' : chordLabel(chord, settings.accidentals) }}
    </p>

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
