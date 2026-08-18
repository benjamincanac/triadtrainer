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
 * Never named before you answer. A right one is named on the way out, since the
 * next prompt is another chord and there is nothing left to give away. A miss
 * retries the same chord, so that one only names it if you've asked for it. The
 * lamps still show which notes it was either way.
 */
const headline = computed(() => {
  if (!props.chord || props.phase === 'awaiting') return '?'
  if (props.phase === 'wrong' && !settings.value.revealName) return '?'
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
      class="font-serif text-[clamp(2.75rem,min(11vw,8vh),4.5rem)] leading-none italic transition-colors duration-200"
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
