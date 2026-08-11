<script setup lang="ts">
import { computed } from 'vue'
import type { LampState } from '~/composables/useTrainer'

const props = defineProps<{
  midiNote: number
  label: string
  black: boolean
  showLabel: boolean
  lamp: LampState
  pressed: boolean
}>()

defineEmits<{ press: [midiNote: number] }>()

// MIDI 60 is C4, so the octave number is the scientific one.
const octave = computed(() => Math.floor(props.midiNote / 12) - 1)

const lampClass = computed(() => {
  switch (props.lamp) {
    case 'selected':
      return 'bg-lamp shadow-[0_0_10px_2px_var(--color-lamp)]'
    case 'correct':
      return 'bg-ok shadow-[0_0_10px_2px_var(--color-ok)]'
    case 'wrong':
      return 'bg-bad shadow-[0_0_10px_2px_var(--color-bad)]'
    case 'revealed':
      // The answer you should have played: present, but not claiming credit.
      return 'bg-ok/35'
    default:
      return props.black ? 'bg-white/6' : 'bg-black/8'
  }
})
</script>

<template>
  <button
    type="button"
    :aria-label="`${label} ${octave}`"
    :aria-pressed="pressed"
    :data-lamp="lamp"
    class="group flex h-full w-full cursor-pointer flex-col justify-end select-none focus-visible:z-20"
    :class="black
      ? 'rounded-b-[3px] border border-t-0 border-black/80 bg-linear-to-b from-[#221d17] to-ebony shadow-[0_3px_5px_rgba(0,0,0,0.6)] active:from-ebony active:to-[#1a150f]'
      : 'rounded-b-md border border-t-0 border-default bg-linear-to-b from-ivory to-[#dcd2be] shadow-[inset_0_-6px_10px_-8px_rgba(0,0,0,0.5)] active:from-[#dcd2be] active:to-[#cec3ac]'"
    @pointerdown.prevent="$emit('press', midiNote)"
    @keydown.enter.prevent="$emit('press', midiNote)"
    @keydown.space.prevent.stop="$emit('press', midiNote)"
  >
    <span
      v-if="showLabel"
      class="pointer-events-none mb-1.5 text-center font-mono leading-none tracking-tight"
      :class="black
        ? 'hidden text-[8px] text-ivory/45 sm:block'
        : 'text-[9px] text-ebony/45 sm:text-[10px]'"
    >{{ label }}</span>

    <!-- The lamp. This is the whole feedback channel: no messages, just the
         panel lighting up under the note you touched. -->
    <span
      class="pointer-events-none mx-auto mb-1.5 block rounded-full transition-[background-color,box-shadow] duration-150"
      :class="[lampClass, black ? 'h-1 w-[60%]' : 'h-1.5 w-[62%]']"
    />
  </button>
</template>
