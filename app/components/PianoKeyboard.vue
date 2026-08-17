<script setup lang="ts">
import { keyboardLayout } from '~/composables/useKeyboardLayout'
import { useSettings } from '~/composables/useSettings'
import { noteNames, toPitchClass } from '~/composables/useTheory'
import type { LampState } from '~/composables/useTrainer'

const props = defineProps<{
  lampFor: (pitchClass: number) => LampState
  selected: Set<number>
  showLabels: boolean
  /** Finger numbers per MIDI note, right hand over left. */
  fingers?: Record<number, { right: number, left: number }>
}>()

const { settings } = useSettings()

defineEmits<{ press: [midiNote: number] }>()

/** Two octaves from C4: MIDI 60 to 83. */
const { whiteNotes, blackKeys } = keyboardLayout(60, 24)

function keyProps(note: number) {
  const pitchClass = toPitchClass(note)
  return {
    midiNote: note,
    labels: noteNames(pitchClass, settings.value.accidentals),
    showLabel: props.showLabels,
    lamp: props.lampFor(pitchClass),
    pressed: props.selected.has(pitchClass),
    finger: props.fingers?.[note]
  }
}
</script>

<template>
  <div
    class="relative w-full rounded-lg border border-default bg-ebony/60 p-2 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(237,230,214,0.05)] sm:p-3"
  >
    <!-- felt strip along the top, like the one on a real key bed -->
    <div class="mb-2 h-1 w-full rounded-full bg-linear-to-r from-bad/25 via-bad/40 to-bad/25" />

    <div class="relative h-[clamp(120px,30vw,220px)] w-full">
      <div class="absolute inset-0 flex gap-px">
        <PianoKey
          v-for="note in whiteNotes"
          :key="note"
          v-bind="keyProps(note)"
          :black="false"
          class="min-w-0 flex-1"
          @press="$emit('press', $event)"
        />
      </div>

      <!-- Wrapped rather than positioned directly: the key's own `relative`
           would win over a fallthrough `absolute` in the utility cascade. -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-[62%]">
        <div
          v-for="key in blackKeys"
          :key="key.note"
          class="pointer-events-auto absolute top-0 z-10 h-full"
          :style="{ left: `${key.left}%`, width: `${key.width}%` }"
        >
          <PianoKey
            v-bind="keyProps(key.note)"
            :black="true"
            @press="$emit('press', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
