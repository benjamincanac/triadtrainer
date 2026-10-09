<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSettings } from '~/composables/useSettings'
import {
  CLEF_LINE,
  noteName,
  staffNoteMidi,
  staffNotePool,
  toPitchClass,
  type Clef
} from '~/composables/useTheory'
import type { StaffDiagramNote } from './StaffDiagram.vue'

const emit = defineEmits<{ play: [notes: number[]] }>()

const { settings } = useSettings()

const MIDDLE_C = 60

function name(pitchClass: number) {
  return noteName(pitchClass, settings.value.accidentals, settings.value.naming)
}

/**
 * Treble first: it is the hand most lessons start with. Each keyboard spans
 * exactly what its staff writes, A3 to A5 and C2 to E4. The copy names its
 * notes through the settings, so a clef reads `Sol clef` to someone on do ré mi.
 */
const copy = computed<{ clef: Clef, title: string, alias: string, blurb: string, start: number, semitones: number }[]>(() => [
  {
    clef: 'treble',
    title: 'Treble clef',
    alias: `${name(7)} clef, right hand`,
    blurb: `The curl wraps the second line, and that line is ${name(7)}. Middle ${name(0)} hangs on a ledger line under the staff.`,
    start: 57,
    semitones: 25
  },
  {
    clef: 'bass',
    title: 'Bass clef',
    alias: `${name(5)} clef, left hand`,
    blurb: `The two dots sit either side of the fourth line, and that line is ${name(5)}. Middle ${name(0)} stands on a ledger line over the staff.`,
    start: 36,
    semitones: 29
  }
])

/** Which note of each staff is lit. Opens on the one its clef names. */
const selected = ref<Record<Clef, number>>({ ...CLEF_LINE })

const staves = computed(() => copy.value.map((each) => {
  const pool = staffNotePool(each.clef).map((note) => {
    const midi = staffNoteMidi(note)
    return { position: note.position, midi, name: name(toPitchClass(midi)) }
  })

  const notes: StaffDiagramNote[] = pool.map((note) => {
    const on = note.position === selected.value[each.clef]
    // The clef's own line and middle C are the two places to count from, so
    // their names stay bright while the rest sit back.
    const landmark = note.position === CLEF_LINE[each.clef] || note.midi === MIDDLE_C
    return {
      position: note.position,
      label: note.name,
      tone: on ? 'primary' : 'highlighted',
      labelTone: on ? 'primary' : landmark ? 'highlighted' : 'muted'
    }
  })

  // The staff itself is positions 0 to 8, lines on the even ones.
  const onStaff = pool.filter(note => note.position >= 0 && note.position <= 8)

  return {
    ...each,
    pool,
    notes,
    lit: pool.find(note => note.position === selected.value[each.clef])!.midi,
    lines: onStaff.filter(note => note.position % 2 === 0).map(note => note.name),
    spaces: onStaff.filter(note => note.position % 2 === 1).map(note => note.name)
  }
}))

function select(clef: Clef, position: number, midi: number) {
  selected.value = { ...selected.value, [clef]: position }
  emit('play', [midi])
}

/** A key outside the staff still sounds, it just has no note to light. */
function press(staff: (typeof staves.value)[number], midi: number) {
  const note = staff.pool.find(each => each.midi === midi)
  if (note) select(staff.clef, note.position, midi)
  else emit('play', [midi])
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <p class="max-w-prose text-xs leading-relaxed text-muted">
      A clef names one line, and every other note is counted from it. Lines and spaces
      alternate, one white key per step. Middle {{ name(0) }} is written on both staves:
      <span class="text-highlighted">same key, two places</span>.
    </p>

    <div class="flex flex-col gap-2.5">
      <UCard v-for="staff in staves" :key="staff.clef" as="article" :ui="{ body: 'flex flex-col gap-3' }">
        <div class="flex flex-col gap-1">
          <div class="flex items-baseline gap-2">
            <h3 class="font-mono text-xs text-highlighted">
              {{ staff.title }}
            </h3>
            <span class="font-mono text-[10px] text-muted">
              {{ staff.alias }}
            </span>
          </div>
          <p class="text-[11px] leading-relaxed text-muted">
            {{ staff.blurb }}
          </p>
        </div>

        <StaffDiagram
          :clef="staff.clef"
          :notes="staff.notes"
          :spacing="22"
          interactive
          class="w-full max-w-xl self-center"
          @select="select(staff.clef, staff.pool[$event]!.position, staff.pool[$event]!.midi)"
        />

        <MiniKeyboard
          :notes="[staff.lit]"
          :roots="[staff.lit]"
          :start-note="staff.start"
          :semitones="staff.semitones"
          :labels="false"
          interactive
          height="h-14 sm:h-16"
          @press="press(staff, $event)"
        />

        <p class="font-mono text-[10px] text-muted">
          <span>Lines </span><span class="text-highlighted">{{ staff.lines.join(' ') }}</span>
          <span class="px-1 opacity-40">·</span>
          <span>Spaces </span><span class="text-highlighted">{{ staff.spaces.join(' ') }}</span>
        </p>
      </UCard>
    </div>
  </section>
</template>
