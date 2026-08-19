import { isBlackKey } from './useTheory'

export interface BlackKeyPlacement {
  note: number
  /** Percent from the left edge of the key bed. */
  left: number
  /** Percent of the key bed's width. */
  width: number
}

export interface KeyboardLayout {
  notes: number[]
  whiteNotes: number[]
  blackKeys: BlackKeyPlacement[]
}

/**
 * White keys share the width evenly; each black key straddles the seam between
 * two of them. Everything is expressed in percentages so a keyboard scales with
 * its container rather than scrolling.
 */
export function keyboardLayout(startNote: number, semitones: number): KeyboardLayout {
  const notes = Array.from({ length: semitones }, (_, i) => startNote + i)
  const whiteNotes = notes.filter(note => !isBlackKey(note))
  const whiteWidth = 100 / whiteNotes.length

  const blackKeys = notes.filter(isBlackKey).map((note) => {
    const seam = whiteNotes.filter(white => white < note).length
    const width = whiteWidth * 0.62
    return { note, left: seam * whiteWidth - width / 2, width }
  })

  return { notes, whiteNotes, blackKeys }
}
