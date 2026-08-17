<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '~/composables/useSettings'
import { chordLabel, type Chord } from '~/composables/useTheory'
import type { Phase } from '~/composables/useTrainer'

const props = defineProps<{
  chord: Chord | null
  phase: Phase
  verdict: string
}>()

const { settings } = useSettings()

/**
 * Never named before you answer, and only after if you've asked for it. A miss
 * retries the same chord, so naming it first hands you the retry. The lamps
 * still show which notes it was either way.
 */
const headline = computed(() => {
  if (!props.chord || props.phase === 'awaiting' || !settings.value.revealName) return '?'
  return chordLabel(props.chord, settings.value.accidentals)
})
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
      {{ headline }}
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
