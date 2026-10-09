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
 * How the five black keys are spelled. A preference, not a fact, which is why
 * `both` is an option: the two names are the same key either way.
 */
export type Accidentals = 'flats' | 'sharps' | 'both'

export const FLAT_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B'
] as const

export const SHARP_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B'
] as const

export const DEFAULT_ACCIDENTALS: Accidentals = 'sharps'

/**
 * What the seven naturals are called. Letters are the English names, solfège
 * the fixed-do syllables a French or Italian teacher says: do is always C,
 * whatever the key. The same key either way, so this is a preference too.
 */
export type Naming = 'letters' | 'solfege'

export const DEFAULT_NAMING: Naming = 'letters'

const SOLFEGE: Record<string, string> = {
  C: 'Do',
  D: 'Ré',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si'
}

/** `C#` to `Do#`, `Bb` to `Sib`. The accidental rides along untouched. */
function inNaming(name: string, naming: Naming): string {
  return naming === 'solfege' ? SOLFEGE[name[0]!]! + name.slice(1) : name
}

/**
 * Every name a pitch class goes by under the chosen spelling: one of them, or
 * both for a black key under `both`. White keys are spelled identically either
 * way, so they always come back as a single name.
 *
 * Separate from `noteName` because a name pair has to stack on a black key cap
 * and in a grid column, where `C#/Db` on one line doesn't fit.
 */
export function noteNames(
  pitchClass: PitchClass,
  accidentals: Accidentals = DEFAULT_ACCIDENTALS,
  naming: Naming = DEFAULT_NAMING
): string[] {
  const pc = normalize(pitchClass)
  const names = accidentals === 'both' && isBlackKey(pc)
    ? [SHARP_NAMES[pc]!, FLAT_NAMES[pc]!]
    : [(accidentals === 'flats' ? FLAT_NAMES : SHARP_NAMES)[pc]!]
  return names.map(name => inNaming(name, naming))
}

/**
 * The name of a pitch class in the chosen spelling. One table drives both the
 * chord prompt and the key caps, so a key never reads C# while its chord reads
 * Db.
 */
export function noteName(
  pitchClass: PitchClass,
  accidentals: Accidentals = DEFAULT_ACCIDENTALS,
  naming: Naming = DEFAULT_NAMING
): string {
  return noteNames(pitchClass, accidentals, naming).join('/')
}

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

/** `C major`, `G# minor`. */
export function chordLabel(
  chord: Chord,
  accidentals: Accidentals = DEFAULT_ACCIDENTALS,
  naming: Naming = DEFAULT_NAMING
): string {
  return `${noteName(chord.root, accidentals, naming)} ${chord.quality}`
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

/**
 * All 24 triads, chromatically by root and major before minor: C, Cm, C#, C#m
 * and so on. Ordered practice walks this list, and hearing a root's major and
 * minor back to back is what makes the third audible.
 */
export function allChords(): Chord[] {
  const chords: Chord[] = []
  for (let root = 0; root < PITCH_CLASS_COUNT; root++) {
    for (const quality of ['major', 'minor'] as const) {
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
  return allChords().filter((chord) => {
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

/** Finger numbers, thumb = 1, little finger = 5, given low note to high note. */
export interface Fingering {
  right: number[]
  left: number[]
}

/**
 * Every inversion holds a third and a fourth. The fourth is the wider reach, so
 * it has to land on the widest gap the hand has: thumb to index going up on the
 * right, index to thumb going up on the left. That gives one exception per hand
 * and 1-3-5 / 5-3-1 everywhere else.
 */
export const FINGERINGS: Record<InversionName, Fingering> = {
  root: { right: [1, 3, 5], left: [5, 3, 1] },
  // E G C: the fourth is on top.
  first: { right: [1, 2, 5], left: [5, 3, 1] },
  // G C E: the fourth is at the bottom.
  second: { right: [1, 3, 5], left: [5, 2, 1] }
}

export function fingering(name: InversionName): Fingering {
  return FINGERINGS[name]
}

export interface Inversion {
  name: InversionName
  /** Ascending MIDI notes. */
  notes: number[]
  /** Which chord tone is at the bottom. */
  bass: 'root' | 'third' | 'fifth'
  /** Finger numbers aligned with `notes`. */
  fingering: Fingering
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
    return { name, notes, bass: bassOrder[index]!, fingering: FINGERINGS[name] }
  })
}

/** How each inversion reads in a prompt. One table, so prompt and verdict agree. */
const INVERSION_LABELS: Record<InversionName, string> = {
  root: 'root position',
  first: '1st inversion',
  second: '2nd inversion'
}

export function inversionLabel(name: InversionName): string {
  return INVERSION_LABELS[name]
}

/**
 * The pitch class an inversion demands in the bass. `chordPitchClasses` is root,
 * third, fifth, which is also root, first, second.
 */
export function inversionBass(chord: Chord, inversion: InversionName): PitchClass {
  return chordPitchClasses(chord)[INVERSION_NAMES.indexOf(inversion)]!
}

/**
 * The stricter grade: the right three pitch classes *and* the right one at the
 * bottom. Everything above the bass stays free, so doubling and octave spread
 * are as unconstrained as they are in `matchesTriad`.
 *
 * Takes MIDI notes rather than pitch classes, because the set collapse loses
 * the one piece of information this needs.
 */
export function matchesInversion(
  notes: Iterable<number>,
  chord: Chord,
  inversion: InversionName
): boolean {
  const played = [...notes]
  if (played.length === 0) return false
  if (!matchesTriad(played, chord)) return false
  return toPitchClass(Math.min(...played)) === inversionBass(chord, inversion)
}

/** root → first → second → root. Ordered practice cycles a chord this way. */
export function nextInversion(name: InversionName): InversionName {
  return INVERSION_NAMES[(INVERSION_NAMES.indexOf(name) + 1) % INVERSION_NAMES.length]!
}

export interface IdentifiedChord {
  chord: Chord
  /** Read from the lowest note played, not from the set. */
  inversion: InversionName
  bass: PitchClass
}

/**
 * The drill in reverse: name what's being held. Takes MIDI notes rather than
 * pitch classes, because the lowest note is what decides the inversion, and
 * that information is gone once the set is collapsed.
 *
 * Returns null for anything that isn't one of the 24 triads, including
 * augmented and diminished shapes, so the caller can say so honestly.
 */
export function identifyTriad(notes: Iterable<number>): IdentifiedChord | null {
  const played = [...notes]
  const pitchClasses = pitchClassSet(played)
  if (pitchClasses.size !== 3) return null

  const chord = allChords().find(candidate => matchesTriad(pitchClasses, candidate))
  if (!chord) return null

  const bass = toPitchClass(Math.min(...played))
  // chordPitchClasses is root, third, fifth, which is also root/first/second.
  const index = chordPitchClasses(chord).indexOf(bass)
  return { chord, inversion: INVERSION_NAMES[index] ?? 'root', bass }
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

/** Tonic, up the seven degrees to the octave tonic, back down: 8 + 7 steps. */
export const SCALE_RUN_LENGTH = 15

/**
 * The pitch classes of an up-and-down scale run, one per expected note. A
 * palindrome with the tonic at 0, 7 and 14. Pitch classes rather than MIDI
 * notes so the run can be played in any octave, or even change octave halfway
 * up — the drill grades what degree comes next, not where the hand sits.
 */
export function scaleRun(root: PitchClass, quality: Quality): PitchClass[] {
  const up = [...scale(root, quality), normalize(root)]
  return [...up, ...up.slice(0, -1).reverse()]
}

export type ScaleStepVerdict = 'advance' | 'complete' | 'wrong'

/**
 * Grade one note-on against the run. Order is the whole exercise here, so this
 * is the one validator that cares about it: the note either is the next step or
 * it's wrong, and 'complete' only lands on the final step.
 *
 * Safe to drive from note-ons alone: no two consecutive steps of any run share
 * a pitch class (the degrees are distinct and the turnaround is tonic to
 * seventh), so a held note can never advance twice.
 */
export function scaleStep(run: PitchClass[], index: number, note: number): ScaleStepVerdict {
  if (toPitchClass(note) !== run[index]) return 'wrong'
  return index === run.length - 1 ? 'complete' : 'advance'
}

/** `C major scale`. One table with chordLabel, so prompt and verdict agree. */
export function scaleLabel(
  chord: Chord,
  accidentals: Accidentals = DEFAULT_ACCIDENTALS,
  naming: Naming = DEFAULT_NAMING
): string {
  return `${chordLabel(chord, accidentals, naming)} scale`
}

/* -------------------------------------------------------------------------- */
/* Staff reading                                                              */
/* -------------------------------------------------------------------------- */

export type Clef = 'treble' | 'bass'

/** Which staves the reading drill draws from. */
export type ClefFilter = Clef | 'both'

/** Low staff first, so an ordered walk over both climbs the whole range. */
export const CLEFS: Clef[] = ['bass', 'treble']

/** A sign written in front of a note, raising or lowering it a semitone. */
export type Alteration = 'sharp' | 'flat'

/** Which altered notes the reading drill adds to the naturals. */
export type Alterations = 'none' | 'flats' | 'sharps' | 'both'

/**
 * A note as it is written: a clef, a height on its staff, and a sharp or flat
 * when it has one. The position counts diatonic steps up from the bottom line,
 * so lines are even and spaces are odd, and it is the natural that sits there:
 * the sign moves the key, never the note head.
 */
export interface StaffNote {
  clef: Clef
  position: number
  alteration?: Alteration
}

/** The MIDI note sitting on the bottom line of each staff: G2 and E4. */
const BOTTOM_LINE: Record<Clef, number> = { bass: 43, treble: 64 }

/**
 * The line each clef names, as a staff position: G4 on the second line of the
 * treble staff, F3 on the fourth of the bass. Every other note is read by
 * counting from here, which is why the lesson and the glyphs both hang on it.
 */
export const CLEF_LINE: Record<Clef, number> = { bass: 6, treble: 2 }

/**
 * How far past its five lines each staff is written. One ledger line on the
 * outside, two on the side facing the other staff: that middle stretch, A3 to
 * E4, is where the two hands meet and where early pieces put either of them.
 * Middle C sits in both, under the treble and over the bass.
 */
export const STAFF_RANGE: Record<Clef, { min: number, max: number }> = {
  bass: { min: -2, max: 12 },
  treble: { min: -4, max: 10 }
}

/**
 * The naturals that take each sign. Not all seven: E#, B#, Cb and Fb are white
 * keys under another name, which is a lesson for later than this one.
 */
const SHARPENED: readonly PitchClass[] = [5, 0, 7, 2, 9]
const FLATTENED: readonly PitchClass[] = [11, 4, 9, 2, 7]

/** Count white keys instead of semitones, so one step is one staff position. */
function toDiatonic(midiNote: number): number {
  return Math.floor(midiNote / PITCH_CLASS_COUNT) * WHITE_ROOTS.length + WHITE_ROOTS.indexOf(toPitchClass(midiNote))
}

function fromDiatonic(index: number): number {
  const degree = ((index % WHITE_ROOTS.length) + WHITE_ROOTS.length) % WHITE_ROOTS.length
  return Math.floor(index / WHITE_ROOTS.length) * PITCH_CLASS_COUNT + WHITE_ROOTS[degree]!
}

/** The natural at a staff position, whatever sign is written in front of it. */
function staffNatural(note: StaffNote): number {
  return fromDiatonic(toDiatonic(BOTTOM_LINE[note.clef]) + note.position)
}

/** The MIDI note a written note stands for. Treble position 0 is E4. */
export function staffNoteMidi(note: StaffNote): number {
  const shift = note.alteration === 'sharp' ? 1 : note.alteration === 'flat' ? -1 : 0
  return staffNatural(note) + shift
}

/**
 * A written note by name. Spelled from what is on the staff rather than from
 * the key it lands on, so a written Bb never comes back as A#, whichever way
 * the key caps are set to spell their black keys.
 */
export function staffNoteName(note: StaffNote, naming: Naming = DEFAULT_NAMING): string {
  const sign = note.alteration === 'sharp' ? '#' : note.alteration === 'flat' ? 'b' : ''
  return inNaming(SHARP_NAMES[toPitchClass(staffNatural(note))]! + sign, naming)
}

/**
 * Every note the reading drill can show, low to high within each staff. With
 * alterations on, a position that takes one gives its flat, its natural and
 * its sharp in that order, which is also low to high.
 */
export function staffNotePool(clef: ClefFilter = 'both', alterations: Alterations = 'none'): StaffNote[] {
  const flats = alterations === 'flats' || alterations === 'both'
  const sharps = alterations === 'sharps' || alterations === 'both'
  const notes: StaffNote[] = []
  for (const each of CLEFS) {
    if (clef !== 'both' && clef !== each) continue
    for (let position = STAFF_RANGE[each].min; position <= STAFF_RANGE[each].max; position++) {
      const natural = toPitchClass(staffNatural({ clef: each, position }))
      if (flats && FLATTENED.includes(natural)) notes.push({ clef: each, position, alteration: 'flat' })
      notes.push({ clef: each, position })
      if (sharps && SHARPENED.includes(natural)) notes.push({ clef: each, position, alteration: 'sharp' })
    }
  }
  return notes
}

/**
 * The ledger lines a position needs, as staff positions. The staff itself is
 * 0 to 8, so the first one below sits at -2 and the first one above at 10.
 */
export function ledgerLines(position: number): number[] {
  const lines: number[] = []
  for (let line = -2; line >= position; line -= 2) lines.push(line)
  for (let line = 10; line <= position; line += 2) lines.push(line)
  return lines
}

export function sameStaffNote(a: StaffNote | null, b: StaffNote | null): boolean {
  if (!a || !b) return false
  return a.clef === b.clef && a.position === b.position && a.alteration === b.alteration
}

/**
 * Does this key play the written note? Graded by pitch class like everything
 * else: the on-screen keyboard starts at C4, so a strict octave would put the
 * whole bass staff out of reach of a click.
 */
export function matchesStaffNote(midiNote: number, note: StaffNote): boolean {
  return toPitchClass(midiNote) === toPitchClass(staffNoteMidi(note))
}

/** `pickChord` for written notes: no immediate repeat, injectable random. */
export function pickStaffNote(
  pool: StaffNote[],
  previous: StaffNote | null = null,
  random: () => number = Math.random
): StaffNote | null {
  if (pool.length === 0) return null
  const candidates = pool.length > 1 ? pool.filter(note => !sameStaffNote(note, previous)) : pool
  const list = candidates.length > 0 ? candidates : pool
  return list[Math.floor(random() * list.length) % list.length]!
}

/**
 * How far a hand reaches without moving, in staff positions: five white keys
 * under five fingers, so a fifth from thumb to little finger.
 */
export const HAND_SPAN = 4

/**
 * A line of notes to read in order, all on one staff and all inside one hand
 * position. The first is drawn like a single note, away from where the
 * previous line started. The hand is then set down somewhere around it, and
 * the rest come from the five keys under it without repeating in place.
 *
 * One position per line is how beginner pieces are written, and it is what
 * gives the line a fingering: see `lineFingering`.
 */
export function pickStaffLine(
  pool: StaffNote[],
  length: number,
  previous: StaffNote[] = [],
  random: () => number = Math.random
): StaffNote[] {
  const first = pickStaffNote(pool, previous[0] ?? null, random)
  if (!first) return []

  const staff = pool.filter(note => note.clef === first.clef)
  const positions = staff.map(note => note.position)
  // Every place the hand can sit and still cover the first note, kept on the staff.
  const lowest = Math.max(Math.min(...positions), first.position - HAND_SPAN)
  const highest = Math.max(lowest, Math.min(first.position, Math.max(...positions) - HAND_SPAN))
  const low = lowest + Math.floor(random() * (highest - lowest + 1)) % (highest - lowest + 1)
  // One spelling per height. A sign holds until the bar ends, so a B written
  // after a Bb would be read as flat too without a natural sign to cancel it,
  // and this draws none.
  const hand: StaffNote[] = []
  for (let position = low; position <= low + HAND_SPAN; position++) {
    const spellings = position === first.position ? [first] : staff.filter(note => note.position === position)
    if (spellings.length > 0) hand.push(spellings[Math.floor(random() * spellings.length) % spellings.length]!)
  }

  const line = [first]
  while (line.length < length) {
    const last = line.at(-1)!
    const others = hand.filter(note => note.position !== last.position)
    // A pool of one has nowhere to go, so the line holds the note instead.
    line.push(others.length > 0 ? others[Math.floor(random() * others.length) % others.length]! : last)
  }
  return line
}

/**
 * Finger numbers for a line, thumb = 1, aligned with its notes. The treble
 * staff is the right hand and the bass the left, as a first book has it. The
 * lowest note takes the right thumb or the left little finger, and every
 * other note the finger that many keys along.
 *
 * Null when the line is wider than a hand: that needs a thumb crossing or a
 * shift, and which one is a choice, not a fact this can print.
 */
export function lineFingering(line: StaffNote[]): number[] | null {
  if (line.length === 0) return null
  const positions = line.map(note => note.position)
  const low = Math.min(...positions)
  if (Math.max(...positions) - low > HAND_SPAN) return null
  return line.map(note => note.clef === 'treble' ? note.position - low + 1 : 5 - (note.position - low))
}

/**
 * Ordered practice: the next stretch of the pool from `start`, wrapping the
 * starting point. It stops short at the top of a staff rather than running on
 * into the other clef, since one line is drawn under one clef. A height is
 * written once per line, for the reason `pickStaffLine` gives, so with signs
 * on a line takes the first spelling it meets and passes over the others.
 */
export function staffRun(pool: StaffNote[], start: number, length: number): StaffNote[] {
  if (pool.length === 0) return []
  const from = ((start % pool.length) + pool.length) % pool.length
  const line: StaffNote[] = []
  for (let i = from; i < pool.length && line.length < length; i++) {
    const note = pool[i]!
    if (line.length > 0 && note.clef !== line[0]!.clef) break
    if (line.some(written => written.position === note.position)) continue
    line.push(note)
  }
  return line
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

/**
 * Uniform over the three inversions, repeats allowed: unlike the chord, hearing
 * the same inversion twice running is no giveaway.
 */
export function pickInversion(random: () => number = Math.random): InversionName {
  return INVERSION_NAMES[Math.floor(random() * INVERSION_NAMES.length) % INVERSION_NAMES.length]!
}
