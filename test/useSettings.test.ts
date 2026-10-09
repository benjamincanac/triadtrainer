import { describe, expect, it } from 'vitest'
import { sanitize, tabOf, withTab } from '../app/composables/useSettings'

describe('tabOf', () => {
  it('reads the exercise in drill mode and the mode otherwise', () => {
    expect(tabOf({ mode: 'drill', exercise: 'notes' })).toBe('notes')
    expect(tabOf({ mode: 'ear', exercise: 'notes' })).toBe('ear')
    expect(tabOf({ mode: 'explore', exercise: 'triads' })).toBe('explore')
  })
})

describe('withTab', () => {
  const fresh = sanitize(null)

  it('sets the mode and the exercise for the tab', () => {
    expect(tabOf(withTab(fresh, 'scales'))).toBe('scales')
    expect(withTab(fresh, 'ear').mode).toBe('ear')
    // The exercise is left alone under ear, so the drill tab can come back to it.
    expect(withTab(withTab(fresh, 'notes'), 'ear').exercise).toBe('notes')
  })

  it('keeps a setting on the tab it was made on', () => {
    const notes = { ...withTab(fresh, 'notes'), order: 'sequential' as const }
    const triads = withTab(notes, 'triads')
    expect(triads.order).toBe('random')
    expect(withTab(triads, 'notes').order).toBe('sequential')
  })

  it('keeps all three shared settings apart', () => {
    const scales = { ...withTab(fresh, 'scales'), quality: 'minor' as const, whiteRootsOnly: true }
    const ear = withTab(scales, 'ear')
    expect(ear.quality).toBe('both')
    expect(ear.whiteRootsOnly).toBe(false)
    const back = withTab(ear, 'scales')
    expect(back.quality).toBe('minor')
    expect(back.whiteRootsOnly).toBe(true)
  })

  it('leaves the settings every tab shares where they are', () => {
    const solfege = { ...fresh, naming: 'solfege' as const, hideNames: true }
    const notes = withTab(solfege, 'notes')
    expect(notes.naming).toBe('solfege')
    expect(notes.hideNames).toBe(true)
  })

  it('is a no-op on the tab already open', () => {
    expect(withTab(fresh, 'triads')).toBe(fresh)
  })
})

describe('sanitize', () => {
  it('starts every tab of an older row from what was set', () => {
    const migrated = sanitize({ mode: 'drill', exercise: 'triads', order: 'sequential', whiteRootsOnly: true })
    expect(withTab(migrated, 'notes').order).toBe('sequential')
    expect(withTab(migrated, 'ear').whiteRootsOnly).toBe(true)
  })

  it('reads back what each tab was left with', () => {
    const stored = { ...withTab(sanitize(null), 'notes'), order: 'sequential' as const }
    const reloaded = sanitize(JSON.parse(JSON.stringify(withTab(stored, 'triads'))))
    expect(reloaded.order).toBe('random')
    expect(withTab(reloaded, 'notes').order).toBe('sequential')
  })

  it('falls back per field on a damaged tab entry', () => {
    const damaged = sanitize({ order: 'sequential', perTab: { notes: { order: 'nope' } } } as never)
    expect(withTab(damaged, 'notes').order).toBe('sequential')
  })
})
