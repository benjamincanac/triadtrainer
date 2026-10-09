<script setup lang="ts">
import { computed } from 'vue'
import { CLEF_LINE, ledgerLines, type Alteration, type Clef } from '~/composables/useTheory'

/** The app's text colours, which is all a note head ever needs to be. */
export type StaffTone = 'highlighted' | 'muted' | 'primary' | 'ok' | 'bad'

export interface StaffDiagramNote {
  /** Diatonic steps above the bottom line. */
  position: number
  /** A sharp or flat drawn in front of the head. */
  alteration?: Alteration
  tone?: StaffTone
  /** Printed under the staff. Leave it out and the row isn't drawn at all. */
  label?: string
  labelTone?: StaffTone
}

const props = withDefaults(defineProps<{
  clef: Clef
  notes: StaffDiagramNote[]
  /** Horizontal room per note. The default centres a single one in the prompt. */
  spacing?: number
  /** Whether the notes are pressable. Off by default, like `MiniKeyboard`. */
  interactive?: boolean
}>(), {
  spacing: 92,
  interactive: false
})

const emit = defineEmits<{ select: [index: number] }>()

/** Half a staff space, which is one position. Everything else is a multiple. */
const STEP = 5
/**
 * Where the bottom line sits. Above it there is room for the bass staff's two
 * ledger lines and a flat standing on the top one, below it for the treble's
 * two: one box for both clefs, so the lines don't jump when the clef changes
 * between prompts.
 */
const BOTTOM = 73
const HEIGHT = 100
/** The strip the clef stands in, before the first note. */
const CLEF_WIDTH = 48
const STEM = 32
const LABEL_ROW = 14

const LINES = [0, 2, 4, 6, 8]

const TONES: Record<StaffTone, string> = {
  highlighted: 'text-highlighted',
  muted: 'text-muted',
  primary: 'text-primary',
  ok: 'text-ok',
  bad: 'text-bad'
}

function y(position: number) {
  return BOTTOM - position * STEP
}

/**
 * The two signs, drawn around the point their note sits on and stroked rather
 * than set in a font: the music block is missing from too many of them.
 */
const SIGNS: Record<Alteration, { d: string, width: number }[]> = {
  flat: [{ d: 'M0 -11V3.5M0 -1.2C2.5 -3.8 5.2 -2.6 4.6 -0.2C4.2 1.4 2 2.6 0 3.5', width: 1.2 }],
  sharp: [
    { d: 'M-1.6 -5.6V6.4M1.6 -6.4V5.6', width: 0.9 },
    { d: 'M-3.6 -1.2L3.6 -3.2M-3.6 3.2L3.6 1.2', width: 1.8 }
  ]
}

/** Left of the head and clear of its ledger line. The flat is drawn from its stem. */
const SIGN_X: Record<Alteration, number> = { flat: -16, sharp: -15 }

/**
 * Material Design Icons' two clefs (Apache 2.0), inlined so the staff draws
 * offline. Each one is hung on the line it names: the curl of the G clef wraps
 * the second line, and the dots of the F clef straddle the fourth. `anchor` is
 * the height inside the 24 unit glyph that has to land on that line.
 */
const GLYPHS: Record<Clef, { path: string, anchor: number, scale: number, x: number }> = {
  treble: {
    path: 'M13 11V7.5l2.2-2.21c.8-.79.95-2.05.39-3.03A2.47 2.47 0 0 0 13.45 1c-.21 0-.45.03-.64.09C11.73 1.38 11 2.38 11 3.5v3.24L7.86 9.91a5.95 5.95 0 0 0-1.25 6.43c.77 1.9 2.45 3.21 4.39 3.55v.61c0 .26-.23.5-.5.5H9v2h1.5c1.35 0 2.5-1.11 2.5-2.5V20c2.03 0 4.16-1.92 4.16-4.75c0-2.3-1.92-4.25-4.16-4.25m0-7.5c0-.23.11-.41.32-.47c.22-.06.45.03.56.23a.5.5 0 0 1-.08.61l-.8.86zm-2 8c-.97.64-1.7 1.74-1.96 2.76l1.96.52v3.05a3.86 3.86 0 0 1-2.57-2.26c-.59-1.46-.27-3.12.83-4.24L11 9.5zm2 6.5v-5.06c1.17 0 2.18 1.1 2.18 2.31C15.18 17 13.91 18 13 18',
    anchor: 15.5,
    scale: 2.2,
    x: -4
  },
  bass: {
    path: 'M18.5 5A1.5 1.5 0 1 1 17 6.5A1.5 1.5 0 0 1 18.5 5m0 6a1.5 1.5 0 1 1-1.5 1.5a1.5 1.5 0 0 1 1.5-1.5M10 4a5 5 0 0 0-5 5v1a2 2 0 1 0 2.18-2A3 3 0 0 1 10 6a4 4 0 0 1 4 4c0 3.59-2.23 6.19-7 8.2l.76 1.84C13.31 17.72 16 14.43 16 10a6 6 0 0 0-6-6',
    anchor: 9.5,
    scale: 5 / 3,
    x: 2
  }
}

const glyph = computed(() => {
  const { path, anchor, scale, x } = GLYPHS[props.clef]
  return { path, transform: `translate(${x} ${y(CLEF_LINE[props.clef]) - anchor * scale}) scale(${scale})` }
})

const width = computed(() => CLEF_WIDTH + props.spacing * Math.max(props.notes.length, 1))
const labelled = computed(() => props.notes.some(note => note.label))
const height = computed(() => HEIGHT + (labelled.value ? LABEL_ROW : 0))

const heads = computed(() => props.notes.map((note, index) => {
  const cx = CLEF_WIDTH + props.spacing * (index + 0.5)
  const cy = y(note.position)
  // Stems point at the middle line, as written: up from the low half of the
  // staff on the right of the head, down from the high half on its left.
  const up = note.position < 4
  return {
    ...note,
    cx,
    cy,
    stemX: cx + (up ? 5.6 : -5.6),
    stemY: cy + (up ? -STEM : STEM),
    ledgers: ledgerLines(note.position).map(y),
    sign: note.alteration
      ? { strokes: SIGNS[note.alteration], transform: `translate(${cx + SIGN_X[note.alteration]} ${cy})` }
      : null,
    tone: TONES[note.tone ?? 'highlighted'],
    labelTone: TONES[note.labelTone ?? 'muted']
  }
}))

function attrs(index: number) {
  if (!props.interactive) return {}
  return {
    'role': 'button',
    'tabindex': 0,
    'aria-label': heads.value[index]!.label,
    'class': 'group cursor-pointer outline-none'
  }
}

function onKey(event: KeyboardEvent, index: number) {
  if (!props.interactive || (event.key !== 'Enter' && event.key !== ' ')) return
  event.preventDefault()
  emit('select', index)
}
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`">
    <g class="text-dimmed" stroke="currentColor" stroke-width="1">
      <line v-for="line in LINES" :key="line" x1="2" :x2="width - 2" :y1="y(line)" :y2="y(line)" />
    </g>

    <path :d="glyph.path" :transform="glyph.transform" class="text-muted" fill="currentColor" />

    <g
      v-for="(head, index) in heads"
      :key="index"
      v-bind="attrs(index)"
      @click="interactive && emit('select', index)"
      @keydown="onKey($event, index)"
    >
      <!-- The whole column is the target, a note head alone is too small to hit. -->
      <rect
        v-if="interactive"
        :x="head.cx - spacing / 2"
        y="0"
        :width="spacing"
        :height="height"
        rx="3"
        class="fill-transparent group-hover:fill-lamp/5 group-focus-visible:fill-lamp/10"
      />

      <g class="transition-colors duration-200" :class="head.tone" stroke="currentColor">
        <line
          v-for="ledger in head.ledgers"
          :key="ledger"
          :x1="head.cx - 10"
          :x2="head.cx + 10"
          :y1="ledger"
          :y2="ledger"
          stroke-width="1"
        />
        <g v-if="head.sign" :transform="head.sign.transform" fill="none" stroke-linecap="round">
          <path v-for="stroke in head.sign.strokes" :key="stroke.d" :d="stroke.d" :stroke-width="stroke.width" />
        </g>
        <line :x1="head.stemX" :x2="head.stemX" :y1="head.cy" :y2="head.stemY" stroke-width="1.4" />
        <ellipse
          :cx="head.cx"
          :cy="head.cy"
          rx="6.2"
          ry="4.3"
          :transform="`rotate(-20 ${head.cx} ${head.cy})`"
          fill="currentColor"
          stroke="none"
        />
      </g>

      <text
        v-if="head.label"
        :x="head.cx"
        :y="HEIGHT + 9"
        text-anchor="middle"
        class="font-mono text-[8px] transition-colors duration-200"
        :class="head.labelTone"
        fill="currentColor"
      >{{ head.label }}</text>
    </g>
  </svg>
</template>
