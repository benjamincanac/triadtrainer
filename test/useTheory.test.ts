import { describe, expect, it } from 'vitest'
import {
  allChords,
  chordLabel,
  chordPitchClasses,
  chordPool,
  FINGERINGS,
  fingering,
  identifyTriad,
  INVERSION_NAMES,
  inversionBass,
  inversionLabel,
  inversions,
  isBlackKey,
  DEFAULT_ACCIDENTALS,
  FLAT_NAMES,
  matchesInversion,
  matchesTriad,
  nextInversion,
  normalize,
  pickChord,
  pickInversion,
  pitchClassSet,
  noteName,
  rootsInFamily,
  sameChord,
  sameSet,
  scale,
  scaleNotes,
  shapeFamily,
  SHARP_NAMES,
  toPitchClass,
  triad,
  triadShape,
  WHITE_ROOTS,
  type Chord,
  type InversionName
} from '../app/composables/useTheory'

/**
 * The expected triads are written out by hand rather than derived, so the test
 * fails if the formula in useTheory drifts.
 */
const EXPECTED_MAJOR: Record<number, number[]> = {
  0: [0, 4, 7],
  1: [1, 5, 8],
  2: [2, 6, 9],
  3: [3, 7, 10],
  4: [4, 8, 11],
  5: [5, 9, 0],
  6: [6, 10, 1],
  7: [7, 11, 2],
  8: [8, 0, 3],
  9: [9, 1, 4],
  10: [10, 2, 5],
  11: [11, 3, 6]
}

const EXPECTED_MINOR: Record<number, number[]> = {
  0: [0, 3, 7],
  1: [1, 4, 8],
  2: [2, 5, 9],
  3: [3, 6, 10],
  4: [4, 7, 11],
  5: [5, 8, 0],
  6: [6, 9, 1],
  7: [7, 10, 2],
  8: [8, 11, 3],
  9: [9, 0, 4],
  10: [10, 1, 5],
  11: [11, 2, 6]
}

/** A real ascending voicing in MIDI note numbers, root position. */
function rootPosition(chord: Chord, base: number): number[] {
  const steps = chord.quality === 'major' ? [0, 4, 7] : [0, 3, 7]
  return steps.map(step => base + chord.root + step)
}

/** Move the lowest note up an octave, `times` times. */
function invert(notes: number[], times: number): number[] {
  const out = [...notes]
  for (let i = 0; i < times; i++) out.push(out.shift()! + 12)
  return out
}

describe('name tables', () => {
  it('lists the twelve sharp names in pitch class order', () => {
    expect([...SHARP_NAMES]).toEqual([
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
    ])
  })

  it('lists the twelve flat names in pitch class order', () => {
    expect([...FLAT_NAMES]).toEqual([
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
    ])
  })

  it('agrees on the seven white keys and differs on the five black ones', () => {
    for (const pitchClass of WHITE_ROOTS) {
      expect(SHARP_NAMES[pitchClass]).toBe(FLAT_NAMES[pitchClass])
    }
    for (const pitchClass of [1, 3, 6, 8, 10]) {
      expect(SHARP_NAMES[pitchClass]).not.toBe(FLAT_NAMES[pitchClass])
      expect(SHARP_NAMES[pitchClass]).toContain('#')
      expect(FLAT_NAMES[pitchClass]).toContain('b')
    }
  })

  it('defaults to sharps', () => {
    expect(DEFAULT_ACCIDENTALS).toBe('sharps')
    expect(noteName(1)).toBe('C#')
    expect(noteName(6)).toBe('F#')
  })

  it('names notes by pitch class in either spelling, wrapping octaves', () => {
    expect(noteName(0, 'sharps')).toBe('C')
    expect(noteName(12, 'sharps')).toBe('C')
    expect(noteName(61, 'sharps')).toBe('C#')
    expect(noteName(61, 'flats')).toBe('Db')
    expect(noteName(6, 'sharps')).toBe('F#')
    expect(noteName(6, 'flats')).toBe('Gb')
  })

  it('labels chords by root and quality in either spelling', () => {
    expect(chordLabel({ root: 0, quality: 'major' })).toBe('C major')
    expect(chordLabel({ root: 8, quality: 'minor' }, 'sharps')).toBe('G# minor')
    expect(chordLabel({ root: 8, quality: 'minor' }, 'flats')).toBe('Ab minor')
    expect(chordLabel({ root: 6, quality: 'major' }, 'sharps')).toBe('F# major')
    expect(chordLabel({ root: 6, quality: 'major' }, 'flats')).toBe('Gb major')
    expect(chordLabel({ root: 11, quality: 'minor' })).toBe('B minor')
  })
})

describe('pitch classes', () => {
  it('wraps MIDI notes into 0-11', () => {
    expect(toPitchClass(0)).toBe(0)
    expect(toPitchClass(60)).toBe(0)
    expect(toPitchClass(61)).toBe(1)
    expect(toPitchClass(127)).toBe(7)
  })

  it('wraps negatives', () => {
    expect(normalize(-1)).toBe(11)
    expect(normalize(-12)).toBe(0)
    expect(normalize(-13)).toBe(11)
  })

  it('classifies black keys', () => {
    expect(WHITE_ROOTS).toEqual([0, 2, 4, 5, 7, 9, 11])
    for (const pc of [1, 3, 6, 8, 10]) expect(isBlackKey(pc)).toBe(true)
    for (const pc of WHITE_ROOTS) expect(isBlackKey(pc)).toBe(false)
  })

  it('collapses octave duplicates into one entry', () => {
    // three `C` across three octaves is one note
    expect(pitchClassSet([48, 60, 72])).toEqual(new Set([0]))
    expect(pitchClassSet([60, 64, 67, 72, 76])).toEqual(new Set([0, 4, 7]))
  })
})

describe('triads', () => {
  it('builds the twelve major triads', () => {
    for (const [root, expected] of Object.entries(EXPECTED_MAJOR)) {
      expect(triad(Number(root), 'major'), `major on ${root}`).toEqual(expected)
    }
  })

  it('builds the twelve minor triads', () => {
    for (const [root, expected] of Object.entries(EXPECTED_MINOR)) {
      expect(triad(Number(root), 'minor'), `minor on ${root}`).toEqual(expected)
    }
  })

  it('always puts the root first', () => {
    for (const chord of allChords()) {
      expect(chordPitchClasses(chord)[0]).toBe(chord.root)
    }
  })

  it('yields three distinct pitch classes for all 24', () => {
    const chords = allChords()
    expect(chords).toHaveLength(24)
    for (const chord of chords) {
      expect(new Set(chordPitchClasses(chord)).size, chordLabel(chord)).toBe(3)
    }
  })
})

describe('set comparison', () => {
  it('ignores order', () => {
    expect(sameSet([0, 4, 7], [7, 0, 4])).toBe(true)
    expect(sameSet([0, 4, 7], [4, 7, 0])).toBe(true)
  })

  it('ignores octave', () => {
    expect(sameSet([60, 64, 67], [0, 4, 7])).toBe(true)
    expect(sameSet([36, 88, 55], [0, 4, 7])).toBe(true)
  })

  it('ignores duplicates', () => {
    expect(sameSet([0, 0, 4, 7, 12], [0, 4, 7])).toBe(true)
  })

  it('rejects different sets', () => {
    expect(sameSet([0, 4, 7], [0, 3, 7])).toBe(false)
    expect(sameSet([0, 4], [0, 4, 7])).toBe(false)
    expect(sameSet([0, 4, 7, 9], [0, 4, 7])).toBe(false)
  })
})

describe('matchesTriad', () => {
  it('accepts every inversion of every chord, at any octave', () => {
    for (const chord of allChords()) {
      for (const base of [24, 36, 48, 60, 72, 84]) {
        for (const inversion of [0, 1, 2]) {
          const notes = invert(rootPosition(chord, base), inversion)
          expect(
            matchesTriad(notes, chord),
            `${chordLabel(chord)} inversion ${inversion} at ${base}: ${notes.join(',')}`
          ).toBe(true)
        }
      }
    }
  })

  it('accepts C major as C-E-G, G-C-E and E-G-C alike', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    expect(matchesTriad([60, 64, 67], cMajor)).toBe(true) // C E G
    expect(matchesTriad([55, 60, 64], cMajor)).toBe(true) // G C E
    expect(matchesTriad([64, 67, 72], cMajor)).toBe(true) // E G C
    expect(matchesTriad([67, 72, 76], cMajor)).toBe(true) // G C E, higher
  })

  it('accepts a doubled note', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    // left hand doubles the root two octaves down
    expect(matchesTriad([36, 60, 64, 67], cMajor)).toBe(true)
  })

  it('rejects the same root with the wrong quality', () => {
    for (let root = 0; root < 12; root++) {
      const major: Chord = { root, quality: 'major' }
      const minor: Chord = { root, quality: 'minor' }
      expect(matchesTriad(chordPitchClasses(minor), major)).toBe(false)
      expect(matchesTriad(chordPitchClasses(major), minor)).toBe(false)
    }
  })

  it('rejects one note off, too few and too many', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    expect(matchesTriad([60, 65, 67], cMajor)).toBe(false) // F instead of E
    expect(matchesTriad([60, 64], cMajor)).toBe(false)
    expect(matchesTriad([60, 64, 67, 71], cMajor)).toBe(false)
    expect(matchesTriad([], cMajor)).toBe(false)
  })

  it('is unique across all 24 chords', () => {
    // No two of the 24 share a pitch class set, so each chord's notes must
    // validate against itself and nothing else.
    const chords = allChords()
    for (const played of chords) {
      const notes = chordPitchClasses(played)
      const matches = chords.filter(candidate => matchesTriad(notes, candidate))
      expect(matches, chordLabel(played)).toHaveLength(1)
      expect(sameChord(matches[0]!, played)).toBe(true)
    }
  })
})

describe('chordPool', () => {
  it('defaults to all 24', () => {
    expect(chordPool()).toHaveLength(24)
  })

  it('orders chromatically by root, major before minor, for ordered practice', () => {
    const pool = chordPool()
    expect(pool.slice(0, 4)).toEqual([
      { root: 0, quality: 'major' },
      { root: 0, quality: 'minor' },
      { root: 1, quality: 'major' },
      { root: 1, quality: 'minor' }
    ])
    expect(pool.at(-1)).toEqual({ root: 11, quality: 'minor' })
    // Roots never go backwards.
    const roots = pool.map(chord => chord.root)
    expect([...roots].sort((a, b) => a - b)).toEqual(roots)
  })

  it('filters by quality', () => {
    const major = chordPool({ quality: 'major' })
    const minor = chordPool({ quality: 'minor' })
    expect(major).toHaveLength(12)
    expect(minor).toHaveLength(12)
    expect(major.every(chord => chord.quality === 'major')).toBe(true)
    expect(minor.every(chord => chord.quality === 'minor')).toBe(true)
  })

  it('restricts to white roots', () => {
    const pool = chordPool({ whiteRootsOnly: true })
    expect(pool).toHaveLength(14) // 7 roots × 2 qualities
    expect(pool.every(chord => WHITE_ROOTS.includes(chord.root))).toBe(true)
  })

  it('combines both filters', () => {
    const pool = chordPool({ quality: 'major', whiteRootsOnly: true })
    expect(pool).toHaveLength(7)
    expect(pool.map(chord => chord.root)).toEqual([0, 2, 4, 5, 7, 9, 11])
  })
})

describe('shape families', () => {
  const names = (roots: number[]) => roots.map(root => noteName(root, 'sharps'))

  it('sorts the twelve major triads into the four hand shapes', () => {
    expect(names(rootsInFamily('WWW', 'major'))).toEqual(['C', 'F', 'G'])
    expect(names(rootsInFamily('WBW', 'major'))).toEqual(['D', 'E', 'A'])
    expect(names(rootsInFamily('BWB', 'major'))).toEqual(['C#', 'D#', 'G#'])
    expect(names(rootsInFamily('irregular', 'major'))).toEqual(['F#', 'A#', 'B'])
  })

  it('covers all twelve roots exactly once per quality', () => {
    for (const quality of ['major', 'minor'] as const) {
      const roots = (['WWW', 'WBW', 'BWB', 'irregular'] as const)
        .flatMap(family => rootsInFamily(family, quality))
      expect(roots.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    }
  })

  it('reads the shape root-third-fifth', () => {
    expect(triadShape({ root: 0, quality: 'major' })).toBe('WWW') // C E G
    expect(triadShape({ root: 2, quality: 'major' })).toBe('WBW') // D F# A
    expect(triadShape({ root: 1, quality: 'major' })).toBe('BWB') // Db F Ab
    expect(triadShape({ root: 11, quality: 'major' })).toBe('WBB') // B D# F#
    expect(shapeFamily({ root: 11, quality: 'major' })).toBe('irregular')
  })
})

describe('inversions', () => {
  it('gives three ascending voicings of the same pitch classes', () => {
    for (const chord of allChords()) {
      const list = inversions(chord)
      expect(list).toHaveLength(3)
      for (const inversion of list) {
        expect(inversion.notes).toHaveLength(3)
        expect([...inversion.notes].sort((a, b) => a - b)).toEqual(inversion.notes)
        expect(matchesTriad(inversion.notes, chord), `${chordLabel(chord)} ${inversion.name}`).toBe(true)
      }
    }
  })

  it('fingers the fourth on the widest gap in each hand', () => {
    // The fourth is the wide reach, so it takes thumb-to-index (right, going up)
    // or index-to-thumb (left, going up). Everything else is 1-3-5 / 5-3-1.
    expect(fingering('root')).toEqual({ right: [1, 3, 5], left: [5, 3, 1] })
    expect(fingering('first')).toEqual({ right: [1, 2, 5], left: [5, 3, 1] })
    expect(fingering('second')).toEqual({ right: [1, 3, 5], left: [5, 2, 1] })
  })

  it('gives three fingers per hand, thumb included, never repeating one', () => {
    for (const [name, f] of Object.entries(FINGERINGS)) {
      for (const hand of [f.right, f.left]) {
        expect(hand, name).toHaveLength(3)
        expect(new Set(hand).size, name).toBe(3)
        expect(hand.every(n => n >= 1 && n <= 5), name).toBe(true)
        expect(hand, name).toContain(1)
      }
      // Fingers always run low note to high note.
      expect([...f.right].sort((a, b) => a - b), name).toEqual(f.right)
      expect([...f.left].sort((a, b) => b - a), name).toEqual(f.left)
    }
  })

  it('attaches the fingering to every voicing', () => {
    for (const chord of allChords()) {
      for (const inversion of inversions(chord)) {
        expect(inversion.fingering).toEqual(FINGERINGS[inversion.name])
        expect(inversion.fingering.right).toHaveLength(inversion.notes.length)
      }
    }
  })

  it('puts root, third then fifth in the bass', () => {
    const list = inversions({ root: 0, quality: 'major' }, 60)
    expect(list.map(inversion => inversion.notes)).toEqual([
      [60, 64, 67], // C E G
      [64, 67, 72], // E G C
      [67, 72, 76] // G C E
    ])
    expect(list.map(inversion => inversion.bass)).toEqual(['root', 'third', 'fifth'])
  })
})

describe('inversionBass', () => {
  it('demands root, third then fifth in the bass', () => {
    for (const chord of allChords()) {
      const notes = chordPitchClasses(chord)
      expect(inversionBass(chord, 'root'), chordLabel(chord)).toBe(notes[0])
      expect(inversionBass(chord, 'first'), chordLabel(chord)).toBe(notes[1])
      expect(inversionBass(chord, 'second'), chordLabel(chord)).toBe(notes[2])
    }
  })

  it('agrees with the voicings inversions() builds', () => {
    for (const chord of allChords()) {
      for (const voicing of inversions(chord, 60)) {
        expect(
          inversionBass(chord, voicing.name),
          `${chordLabel(chord)} ${voicing.name}`
        ).toBe(toPitchClass(Math.min(...voicing.notes)))
      }
    }
  })
})

describe('matchesInversion', () => {
  it('accepts each voicing under its own name and no other', () => {
    for (const chord of allChords()) {
      for (const voicing of inversions(chord, 60)) {
        for (const name of INVERSION_NAMES) {
          expect(
            matchesInversion(voicing.notes, chord, name),
            `${chordLabel(chord)} ${voicing.name} graded as ${name}`
          ).toBe(name === voicing.name)
        }
      }
    }
  })

  it('ignores which octave the voicing sits in', () => {
    for (const chord of allChords()) {
      for (const base of [36, 48, 60, 72]) {
        for (const index of [0, 1, 2]) {
          const notes = invert(rootPosition(chord, base), index)
          const name = INVERSION_NAMES[index]!
          expect(
            matchesInversion(notes, chord, name),
            `${chordLabel(chord)} ${name} at ${base}`
          ).toBe(true)
        }
      }
    }
  })

  it('accepts a bass doubled an octave up', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    // C in the left hand, C E G in the right: still root position.
    expect(matchesInversion([48, 60, 64, 67], cMajor, 'root')).toBe(true)
  })

  it('accepts an open voicing as long as the bass is right', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    // E at the bottom, G and C spread well above it.
    expect(matchesInversion([52, 79, 84], cMajor, 'first')).toBe(true)
  })

  it('rejects the right notes under the wrong bass', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    // E G C passes the set check, which is exactly what makes it worth grading.
    expect(matchesTriad([64, 67, 72], cMajor)).toBe(true)
    expect(matchesInversion([64, 67, 72], cMajor, 'first')).toBe(true)
    expect(matchesInversion([64, 67, 72], cMajor, 'root')).toBe(false)
    expect(matchesInversion([64, 67, 72], cMajor, 'second')).toBe(false)
  })

  it('rejects the wrong chord however it is voiced', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    const cMinor: Chord = { root: 0, quality: 'minor' }
    for (const voicing of inversions(cMinor, 60)) {
      for (const name of INVERSION_NAMES) {
        expect(matchesInversion(voicing.notes, cMajor, name)).toBe(false)
      }
    }
  })

  it('rejects too few notes, too many, and nothing at all', () => {
    const cMajor: Chord = { root: 0, quality: 'major' }
    expect(matchesInversion([], cMajor, 'root')).toBe(false)
    expect(matchesInversion([60], cMajor, 'root')).toBe(false)
    expect(matchesInversion([60, 64], cMajor, 'root')).toBe(false)
    expect(matchesInversion([60, 64, 67, 71], cMajor, 'root')).toBe(false)
  })
})

describe('inversion cycling and naming', () => {
  it('cycles root to first to second and back', () => {
    expect(nextInversion('root')).toBe('first')
    expect(nextInversion('first')).toBe('second')
    expect(nextInversion('second')).toBe('root')
  })

  it('returns to the start after three steps, from any start', () => {
    for (const name of INVERSION_NAMES) {
      expect(nextInversion(nextInversion(nextInversion(name))), name).toBe(name)
    }
  })

  it('labels the three inversions the way the prompt reads them', () => {
    expect(inversionLabel('root')).toBe('root position')
    expect(inversionLabel('first')).toBe('1st inversion')
    expect(inversionLabel('second')).toBe('2nd inversion')
  })

  it('picks deterministically for a given random value', () => {
    expect(pickInversion(() => 0)).toBe('root')
    expect(pickInversion(() => 0.4)).toBe('first')
    expect(pickInversion(() => 0.99)).toBe('second')
  })

  it('reaches all three across the random range', () => {
    const seen = new Set<InversionName>()
    for (let i = 0; i < 30; i++) seen.add(pickInversion(() => i / 30))
    expect(seen).toEqual(new Set(INVERSION_NAMES))
  })
})

describe('identifyTriad', () => {
  it('names all 24 from their pitch classes', () => {
    for (const chord of allChords()) {
      const found = identifyTriad(chordPitchClasses(chord))
      expect(found, chordLabel(chord)).not.toBeNull()
      expect(sameChord(found!.chord, chord), chordLabel(chord)).toBe(true)
    }
  })

  it('reads the inversion off the lowest note', () => {
    for (const chord of allChords()) {
      for (const voicing of inversions(chord, 60)) {
        const found = identifyTriad(voicing.notes)!
        expect(found, `${chordLabel(chord)} ${voicing.name}`).not.toBeNull()
        expect(sameChord(found.chord, chord)).toBe(true)
        expect(found.inversion, `${chordLabel(chord)} ${voicing.name}`).toBe(voicing.name)
        expect(found.bass).toBe(toPitchClass(Math.min(...voicing.notes)))
      }
    }
  })

  it('ignores octave and duplication', () => {
    // C major spread across three octaves, root doubled
    expect(identifyTriad([36, 60, 64, 67, 72])!.chord).toEqual({ root: 0, quality: 'major' })
    // same set, but E in the bass is still a first inversion
    expect(identifyTriad([52, 60, 67])!.inversion).toBe('first')
  })

  it('returns null for anything that is not one of the 24', () => {
    expect(identifyTriad([])).toBeNull()
    expect(identifyTriad([60])).toBeNull()
    expect(identifyTriad([60, 64])).toBeNull()
    expect(identifyTriad([60, 64, 67, 71])).toBeNull()
    expect(identifyTriad([60, 64, 68])).toBeNull() // augmented
    expect(identifyTriad([60, 63, 66])).toBeNull() // diminished
    expect(identifyTriad([60, 62, 67])).toBeNull() // sus2
  })
})

describe('scales', () => {
  it('builds the major scale', () => {
    expect(scale(0, 'major')).toEqual([0, 2, 4, 5, 7, 9, 11]) // C D E F G A B
    expect(scale(7, 'major')).toEqual([7, 9, 11, 0, 2, 4, 6]) // G A B C D E F#
  })

  it('builds the natural minor scale', () => {
    expect(scale(9, 'minor')).toEqual([9, 11, 0, 2, 4, 5, 7]) // A B C D E F G
    expect(scale(0, 'minor')).toEqual([0, 2, 3, 5, 7, 8, 10])
  })

  it('always contains its own triad', () => {
    for (const chord of allChords()) {
      const degrees = scale(chord.root, chord.quality)
      for (const pitchClass of chordPitchClasses(chord)) {
        expect(degrees, chordLabel(chord)).toContain(pitchClass)
      }
    }
  })

  it('spans an octave tonic to tonic', () => {
    const notes = scaleNotes(0, 'major', 60)
    expect(notes).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
  })

  it('pairs a relative major and minor on the same seven notes', () => {
    // A natural minor and C major are the white keys either way round.
    expect(new Set(scale(9, 'minor'))).toEqual(new Set(scale(0, 'major')))
  })
})

describe('pickChord', () => {
  it('returns null on an empty pool', () => {
    expect(pickChord([])).toBeNull()
  })

  it('never repeats the previous chord', () => {
    const pool = chordPool()
    for (const previous of pool) {
      // sweep the whole random range, every draw must differ from `previous`
      for (let i = 0; i < 23; i++) {
        const picked = pickChord(pool, previous, () => i / 23)
        expect(sameChord(picked, previous), chordLabel(previous)).toBe(false)
      }
    }
  })

  it('repeats when the pool holds a single chord', () => {
    const only: Chord = { root: 0, quality: 'major' }
    expect(pickChord([only], only)).toEqual(only)
  })

  it('is deterministic for a given random value', () => {
    const pool = chordPool({ quality: 'major' })
    expect(pickChord(pool, null, () => 0)).toEqual({ root: 0, quality: 'major' })
    expect(pickChord(pool, null, () => 0.999)).toEqual({ root: 11, quality: 'major' })
  })
})
