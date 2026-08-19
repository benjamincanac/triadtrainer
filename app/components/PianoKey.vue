<script setup lang="ts">
import { computed } from 'vue'
import type { LampState } from '~/composables/useTrainer'

const props = defineProps<{
  midiNote: number
  /** One name, or both spellings of a black key stacked sharp over flat. */
  labels: string[]
  black: boolean
  showLabel: boolean
  lamp: LampState
  pressed: boolean
  finger?: { right: number, left: number }
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
      return 'bg-lamp shadow-[0_0_10px_2px_var(--color-lamp)]'
    default:
      return props.black ? 'bg-white/6' : 'bg-black/8'
  }
})
</script>

<template>
  <button
    type="button"
    :aria-label="`${labels.join(' or ')} ${octave}`"
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
      v-if="finger"
      class="pointer-events-none mb-1 flex flex-col items-center font-mono text-[10px] leading-tight"
      :class="black ? 'text-ivory' : 'text-ebony'"
    >
      <span class="font-semibold">{{ finger.right }}</span>
      <span class="opacity-45">{{ finger.left }}</span>
    </span>

    <!-- Both spellings stack rather than sitting side by side: a black key cap
         is too narrow for `C#/Db` on one line. -->
    <span
      v-if="showLabel"
      class="pointer-events-none mb-1.5 flex-col items-center text-center font-mono leading-none tracking-tight"
      :class="black
        ? 'hidden text-[8px] text-ivory/45 sm:flex'
        : 'flex text-[9px] text-ebony/45 sm:text-[10px]'"
    >
      <span v-for="(name, index) in labels" :key="name" :class="{ 'opacity-60': index > 0 }">
        {{ name }}
      </span>
    </span>

    <!-- The lamp. This is the whole feedback channel: no messages, just the
         panel lighting up under the note you touched. -->
    <span
      class="pointer-events-none mx-auto mb-1.5 block rounded-full transition-[background-color,box-shadow] duration-150"
      :class="[lampClass, black ? 'h-1 w-[60%]' : 'h-1.5 w-[62%]']"
    />
  </button>
</template>
