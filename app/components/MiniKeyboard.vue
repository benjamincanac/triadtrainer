<script setup lang="ts">
import { computed } from 'vue'
import { keyboardLayout } from '~/composables/useKeyboardLayout'
import { useSettings } from '~/composables/useSettings'
import { noteName, toPitchClass } from '~/composables/useTheory'

const props = withDefaults(defineProps<{
  /** MIDI notes to light up. */
  notes: number[]
  /** Subset of `notes` drawn as the root. */
  roots?: number[]
  startNote?: number
  semitones?: number
  labels?: boolean
  /** Match by pitch class instead of exact MIDI note. */
  byPitchClass?: boolean
  /**
   * Whether the keys are pressable. Off by default: a diagram is decorative and
   * often sits inside a button of its own, and a button inside a button is
   * invalid HTML — the parser unnests it and hydration then disagrees with SSR.
   */
  interactive?: boolean
  height?: string
}>(), {
  roots: () => [],
  startNote: 60,
  semitones: 13,
  labels: true,
  byPitchClass: false,
  interactive: false,
  height: 'h-16 sm:h-20'
})

const emit = defineEmits<{ press: [midiNote: number] }>()

const { settings } = useSettings()

const layout = computed(() => keyboardLayout(props.startNote, props.semitones))

const lit = computed(() =>
  new Set(props.byPitchClass ? props.notes.map(toPitchClass) : props.notes)
)

const litRoots = computed(() =>
  new Set(props.byPitchClass ? props.roots.map(toPitchClass) : props.roots)
)

const tag = computed(() => (props.interactive ? 'button' : 'div'))

function key(note: number) {
  const probe = props.byPitchClass ? toPitchClass(note) : note
  const on = lit.value.has(probe)
  return {
    on,
    // A root only counts when it's actually in the voicing. Callers pass every
    // octave of the root, and the inversion that omits one must not light it.
    root: on && litRoots.value.has(probe),
    name: noteName(toPitchClass(note), settings.value.accidentals),
    octave: Math.floor(note / 12) - 1
  }
}

function keyAttrs(note: number) {
  if (!props.interactive) return {}
  return {
    'type': 'button',
    'aria-label': `${key(note).name} ${key(note).octave}`,
    'aria-pressed': key(note).on
  }
}
</script>

<template>
  <div
    class="relative w-full"
    :class="height"
    :aria-hidden="interactive ? undefined : 'true'"
  >
    <div class="absolute inset-0 flex gap-px">
      <component
        :is="tag"
        v-for="note in layout.whiteNotes"
        :key="note"
        v-bind="keyAttrs(note)"
        class="flex min-w-0 flex-1 flex-col justify-end rounded-b border border-t-0 border-default transition-colors"
        :class="[
          interactive ? 'cursor-pointer' : '',
          key(note).root
            ? 'bg-lamp text-ebony'
            : key(note).on
              ? 'bg-lamp-soft text-ebony'
              : 'bg-ivory text-ebony/40'
        ]"
        @pointerdown="interactive && (emit('press', note), $event.preventDefault())"
      >
        <span
          v-if="labels"
          class="pointer-events-none mb-1 text-center font-mono text-[8px] leading-none"
        >{{ key(note).name }}</span>
      </component>
    </div>

    <div class="pointer-events-none absolute inset-x-0 top-0 h-[62%]">
      <component
        :is="tag"
        v-for="black in layout.blackKeys"
        :key="black.note"
        v-bind="keyAttrs(black.note)"
        class="pointer-events-auto absolute top-0 z-10 h-full rounded-b-[3px] border border-t-0 border-black/70 transition-colors"
        :class="[
          interactive ? 'cursor-pointer' : '',
          key(black.note).root
            ? 'bg-lamp'
            : key(black.note).on
              ? 'bg-lamp-deep'
              : 'bg-ebony'
        ]"
        :style="{ left: `${black.left}%`, width: `${black.width}%` }"
        @pointerdown="interactive && (emit('press', black.note), $event.preventDefault())"
      />
    </div>
  </div>
</template>
