<script setup lang="ts">
import { computed } from 'vue'
import { lineFingering, type StaffNote } from '~/composables/useTheory'
import type { Phase } from '~/composables/useTrainer'
import type { StaffDiagramNote } from './StaffDiagram.vue'

const props = defineProps<{
  /** One note, or a line of them to play left to right. All on one staff. */
  notes: StaffNote[]
  /** The note that is due, 0-based. Frozen on a verdict, reset on the retry. */
  step: number
  phase: Phase
  verdict: string
  /** Print finger numbers under a line. A single note never gets one. */
  fingering?: boolean
}>()

const clef = computed(() => props.notes[0]?.clef ?? 'treble')

/**
 * A finger says which key of the hand, not which note, so printing it gives
 * nothing away. Null on a single note and on a line wider than a hand.
 */
const fingers = computed(() =>
  props.fingering && props.notes.length > 1 ? lineFingering(props.notes) : null
)

/** The numbers mean nothing without knowing whose fingers they are. */
const hand = computed(() => clef.value === 'treble' ? 'right hand' : 'left hand')

/**
 * Same colours as the chord name, ivory while it's a question and then the
 * verdict, with one more for a line: notes already played go amber, so the
 * eye can stay on the staff instead of counting keys.
 */
const heads = computed<StaffDiagramNote[]>(() => props.notes.map((note, index) => {
  const tone = props.phase === 'correct'
    ? 'ok'
    : index < props.step
      ? 'primary'
      : index === props.step && props.phase === 'wrong' ? 'bad' : 'highlighted'
  return {
    position: note.position,
    alteration: note.alteration,
    label: fingers.value ? String(fingers.value[index]) : undefined,
    tone
  }
}))

/** A single note has the room to itself; a line has to share it. */
const spacing = computed(() => props.notes.length > 4 ? 30 : props.notes.length > 1 ? 40 : 92)

/**
 * Which staff and how many, never which notes: this is the question, and
 * reading it out would be answering it.
 */
const label = computed(() => {
  if (props.notes.length === 0) return 'No note'
  const count = props.notes.length === 1 ? 'A note' : `${props.notes.length} notes`
  return `${count} on the ${clef.value} staff`
})
</script>

<template>
  <!-- Same rows as the drill prompt, the staff standing in for the chord name. -->
  <div class="flex flex-col items-center gap-3 text-center">
    <p class="font-mono text-[10px] tracking-[0.25em] text-muted uppercase">
      {{ notes.length === 1 ? 'Play this note' : fingers ? `Play these notes, ${hand}` : 'Play these notes, left to right' }}
    </p>

    <StaffDiagram
      :clef="clef"
      :notes="heads"
      :spacing="spacing"
      class="h-[clamp(6.5rem,min(26vw,18vh),9.5rem)] w-auto max-w-full"
      role="img"
      :aria-label="label"
    />

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
