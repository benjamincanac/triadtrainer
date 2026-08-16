<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '~/composables/useSettings'
import {
  chordLabel,
  fingering,
  noteName,
  toPitchClass,
  type IdentifiedChord
} from '~/composables/useTheory'

const props = defineProps<{
  identified: IdentifiedChord | null
  held: Set<number>
}>()

const { settings } = useSettings()

const heldNames = computed(() =>
  [...props.held]
    .sort((a, b) => a - b)
    .map(note => noteName(toPitchClass(note), settings.value.accidentals))
)

const headline = computed(() => {
  if (props.identified) return chordLabel(props.identified.chord, settings.value.accidentals)
  return props.held.size ? 'Not a triad' : 'Play something'
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 text-center">
    <p class="font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
      What you're playing
    </p>

    <p
      class="font-serif text-5xl leading-none italic transition-colors duration-200 sm:text-7xl"
      :class="identified ? 'text-ok' : 'text-muted'"
    >
      {{ headline }}
    </p>

    <!-- Mirrors the drill's verdict line, so the two modes read the same way. -->
    <p aria-live="polite" aria-atomic="true" class="h-4 font-mono text-[11px] tracking-wide">
      <span v-if="identified" class="text-muted">
        {{ identified.inversion }} position
        <span class="px-1 opacity-40">·</span>
        <span class="text-highlighted">R {{ fingering(identified.inversion).right.join('-') }}</span>
        <span class="px-1 opacity-40">·</span>
        L {{ fingering(identified.inversion).left.join('-') }}
      </span>
      <span v-else-if="held.size" class="text-muted">
        {{ heldNames.join(' ') }}
        <span class="px-1 opacity-40">·</span>
        {{ held.size }} {{ held.size === 1 ? 'note' : 'notes' }}, three make a triad
      </span>
    </p>
  </div>
</template>
