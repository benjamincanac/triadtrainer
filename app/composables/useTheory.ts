/**
 * Chord theory, expressed entirely in pitch classes.
 *
 * A pitch class is an integer 0-11 where 0 = C. Everything downstream compares
 * *sets* of pitch classes and never raw MIDI note numbers, which is what makes
 * octave, order and inversion irrelevant by construction: C-E-G, G-C-E and
 * E-G-C all reduce to {0, 4, 7}.
 *
 * This module is deliberately free of any DOM or Vue dependency so it can be
 * tested in plain node. See test/useTheory.test.ts.
 */

/** An integer 0-11. 0 = C. */
export type PitchClass = number

export type Quality = 'major' | 'minor'

export interface Chord {
  root: PitchClass
  quality: Quality
}

/** Which qualities the trainer draws from. */
export type QualityFilter = Quality | 'both'

export const PITCH_CLASS_COUNT = 12

/** Semitones above the root, per quality. */
export const MAJOR_INTERVALS = [0, 4, 7] as const
export const MINOR_INTERVALS = [0, 3, 7] as const

/**
 * Root names indexed by pitch class, used for the chord prompt. Accidentals are
 * spelled the way a chord chart would: flats, except F#.
 */
export const ROOT_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B'
] as const

/**
 * Short names for the key caps. A key has no chord context, so the black keys
 * are spelled the way you'd point at them on the instrument — which is why
 * index 1 reads `C#` here but `Db` in ROOT_NAMES.
 */
export const KEY_NAMES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B'
] as const

/** Pitch classes that fall on a white key. Beginner mode draws roots from here. */
export const WHITE_ROOTS: readonly PitchClass[] = [0, 2, 4, 5, 7, 9, 11]

/** True when the pitch class sits on a black key. */
export function isBlackKey(pitchClass: PitchClass): boolean {
  return !WHITE_ROOTS.includes(normalize(pitchClass))
}

/** Wrap any integer into 0-11, negatives included. */
export function normalize(value: number): PitchClass {
  return ((value % PITCH_CLASS_COUNT) + PITCH_CLASS_COUNT) % PITCH_CLASS_COUNT
}

/** Reduce a MIDI note number (0-127) to its pitch class. */
export function toPitchClass(midiNote: number): PitchClass {
  return normalize(midiNote)
}

/**
 * The three pitch classes of a triad, root first.
 *
 * major: [r, (r+4)%12, (r+7)%12]
 * minor: [r, (r+3)%12, (r+7)%12]
 */
export function triad(root: PitchClass, quality: Quality): PitchClass[] {
  const intervals = quality === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS
  return intervals.map(interval => normalize(root + interval))
}

/** The triad of a chord. */
export function chordPitchClasses(chord: Chord): PitchClass[] {
  return triad(chord.root, chord.quality)
}

/** `C major`, `Ab minor`. */
export function chordLabel(chord: Chord): string {
  return `${ROOT_NAMES[normalize(chord.root)]} ${chord.quality}`
}

/** The key-cap name for a pitch class. */
export function keyName(pitchClass: PitchClass): string {
  return KEY_NAMES[normalize(pitchClass)]!
}

/**
 * Collapse notes (MIDI numbers or pitch classes) into a pitch class set.
 * Two `C` an octave apart become one entry.
 */
export function pitchClassSet(notes: Iterable<number>): Set<PitchClass> {
  const set = new Set<PitchClass>()
  for (const note of notes) set.add(toPitchClass(note))
  return set
}

/** Set equality, order-independent. */
export function sameSet(a: Iterable<number>, b: Iterable<number>): boolean {
  const left = pitchClassSet(a)
  const right = pitchClassSet(b)
  if (left.size !== right.size) return false
  for (const value of left) {
    if (!right.has(value)) return false
  }
  return true
}

/**
 * Does what's being held spell this chord? Compares pitch class sets, so any
 * inversion, any octave, any playing order validates identically.
 */
export function matchesTriad(notes: Iterable<number>, chord: Chord): boolean {
  return sameSet(notes, chordPitchClasses(chord))
}

/** All 24 triads, C major through B minor. */
export function allChords(): Chord[] {
  const chords: Chord[] = []
  for (const quality of ['major', 'minor'] as const) {
    for (let root = 0; root < PITCH_CLASS_COUNT; root++) {
      chords.push({ root, quality })
    }
  }
  return chords
}

export interface ChordPoolOptions {
  quality?: QualityFilter
  whiteRootsOnly?: boolean
}

/** The chords the trainer can draw from, given the current settings. */
export function chordPool(options: ChordPoolOptions = {}): Chord[] {
  const { quality = 'both', whiteRootsOnly = false } = options
  return allChords().filter(chord => {
    if (quality !== 'both' && chord.quality !== quality) return false
    if (whiteRootsOnly && !WHITE_ROOTS.includes(chord.root)) return false
    return true
  })
}

/* -------------------------------------------------------------------------- */
/* Learning aids                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The white/black pattern a triad falls into, root-third-fifth.
 * `WWW`, `WBW`, `BWB` — plus three chords that match nothing else.
 */
export function triadShape(chord: Chord): string {
  return chordPitchClasses(chord)
    .map(pitchClass => (isBlackKey(pitchClass) ? 'B' : 'W'))
    .join('')
}

export type ShapeFamily = 'WWW' | 'WBW' | 'BWB' | 'irregular'

export const SHAPE_FAMILIES: ShapeFamily[] = ['WWW', 'WBW', 'BWB', 'irregular']

/**
 * Major triads sort into three tidy hand shapes and one leftover pile. Learning
 * the four groups beats learning twelve chords: nine of them are the same
 * physical gesture moved around.
 */
export function shapeFamily(chord: Chord): ShapeFamily {
  const shape = triadShape(chord)
  return shape === 'WWW' || shape === 'WBW' || shape === 'BWB' ? shape : 'irregular'
}

/** The roots whose triad of this quality lands in a given family. */
export function rootsInFamily(family: ShapeFamily, quality: Quality): PitchClass[] {
  return allChords()
    .filter(chord => chord.quality === quality && shapeFamily(chord) === family)
    .map(chord => chord.root)
}

export type InversionName = 'root' | 'first' | 'second'

export const INVERSION_NAMES: InversionName[] = ['root', 'first', 'second']

export interface Inversion {
  name: InversionName
  /** Ascending MIDI notes. */
  notes: number[]
  /** Which chord tone is at the bottom. */
  bass: 'root' | 'third' | 'fifth'
}

/**
 * The three inversions as real ascending voicings, so they can be drawn on a
 * keyboard and played. Each one lifts the previous bass note up an octave.
 */
export function inversions(chord: Chord, baseOctaveNote = 60): Inversion[] {
  const intervals = chord.quality === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS
  const root = baseOctaveNote + chord.root
  const voicing = intervals.map(interval => root + interval)
  const bassOrder = ['root', 'third', 'fifth'] as const

  return INVERSION_NAMES.map((name, index) => {
    const notes = [...voicing]
    for (let i = 0; i < index; i++) notes.push(notes.shift()! + 12)
    return { name, notes, bass: bassOrder[index]! }
  })
}

/** Semitones above the tonic. */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] as const
export const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10] as const

/** The seven pitch classes of a major or natural minor scale. */
export function scale(root: PitchClass, quality: Quality): PitchClass[] {
  const steps = quality === 'major' ? MAJOR_SCALE : NATURAL_MINOR_SCALE
  return steps.map(step => normalize(root + step))
}

/** Ascending MIDI notes for one octave of a scale, tonic to tonic. */
export function scaleNotes(root: PitchClass, quality: Quality, baseOctaveNote = 60): number[] {
  const steps = quality === 'major' ? MAJOR_SCALE : NATURAL_MINOR_SCALE
  const tonic = baseOctaveNote + root
  return [...steps.map(step => tonic + step), tonic + 12]
}

/** Which scale degrees (1-indexed) the triad occupies. Always 1, 3, 5. */
export const TRIAD_DEGREES = [1, 3, 5] as const

/** Two chords are the same drill. */
export function sameChord(a: Chord | null, b: Chord | null): boolean {
  if (!a || !b) return false
  return a.root === b.root && a.quality === b.quality
}

/**
 * Pick a chord from the pool, avoiding an immediate repeat so the same prompt
 * never shows twice in a row (unless the pool has only one chord in it).
 *
 * `random` is injectable so the drill order is testable.
 */
export function pickChord(
  pool: Chord[],
  previous: Chord | null = null,
  random: () => number = Math.random
): Chord | null {
  if (pool.length === 0) return null
  const candidates = pool.length > 1 ? pool.filter(chord => !sameChord(chord, previous)) : pool
  const list = candidates.length > 0 ? candidates : pool
  return list[Math.floor(random() * list.length) % list.length]!
}
