<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '~/composables/useSettings'
import { scaleLabel, type Chord } from '~/composables/useTheory'
import type { Phase } from '~/composables/useTrainer'

const props = defineProps<{
  chord: Chord | null
  phase: Phase
  verdict: string
  /** Next step of the run, 0-based. Frozen on a verdict, reset on the retry. */
  step: number
  total: number
}>()

const { settings } = useSettings()

/**
 * One dot per note of the run. The keyboard lamps can't show progress — the
 * scale lights as a set — so how far the run has got lives up here. On a miss
 * the dots freeze where it broke, which is the part worth reading.
 */
const dots = computed(() => Array.from({ length: props.total }, (_, index) => {
  if (props.phase === 'correct' || index < props.step) return 'played'
  if (props.phase === 'wrong' && index === props.step) return 'broke'
  return 'upcoming'
}))

/** The octave tonic, where the run turns around. */
const turnaround = computed(() => Math.floor(props.total / 2))
</script>

<template>
  <!-- Same rows as the drill prompt, so switching exercises doesn't move the
       keyboard up or down the page. -->
  <div class="flex flex-col items-center gap-3 text-center">
    <p class="font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
      Play this scale, up and down
    </p>

    <p
      class="font-serif text-[clamp(2.75rem,min(11vw,8vh),4.5rem)] leading-none italic transition-colors duration-200"
      :class="{
        'text-highlighted': phase === 'awaiting' || phase === 'revealed',
        'text-ok': phase === 'correct',
        'text-bad': phase === 'wrong'
      }"
    >
      {{ chord ? scaleLabel(chord, settings.accidentals) : '—' }}
    </p>

    <!-- The taller dot marks the turnaround at the octave. -->
    <div
      class="flex h-2.5 items-end justify-center gap-1"
      :aria-label="`Step ${Math.min(step + 1, total)} of ${total}`"
    >
      <span
        v-for="(dot, index) in dots"
        :key="index"
        class="w-1.5 rounded-[2px] transition-colors duration-200"
        :class="[
          index === turnaround ? 'h-2.5' : 'h-1.5',
          {
            'bg-lamp': dot === 'played' && phase !== 'correct',
            'bg-ok': dot === 'played' && phase === 'correct',
            'bg-bad': dot === 'broke',
            'bg-accented': dot === 'upcoming'
          }
        ]"
      />
    </div>

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
