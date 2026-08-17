import { describe, expect, it } from 'vitest'
import {
  aggregateByChord,
  computeDayStreak,
  daysFromAttempts,
  formatPercent,
  formatSeconds,
  localDayKey,
  previousDayKey,
  type Attempt,
  type DayRecord
} from '../app/composables/useStats'
import { allChords } from '../app/composables/useTheory'

/**
 * Local-time constructor. Day keys are local by design, so every fixture has to
 * be built the same way or the expectations only hold in one timezone.
 */
function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime()
}

function attempt(partial: Partial<Attempt> = {}): Attempt {
  return { t: at(2026, 8, 17), ms: 1000, ok: true, root: 0, q: 'major', ...partial }
}

function day(d: string, correct = 1, count = correct): DayRecord {
  return { d, count, correct }
}

describe('aggregateByChord', () => {
  it('returns all 24 chords in the order ordered practice walks them', () => {
    const stats = aggregateByChord([])
    expect(stats).toHaveLength(24)
    expect(stats.map(stat => ({ root: stat.root, quality: stat.q }))).toEqual(allChords())
  })

  it('leaves a chord that was never played null rather than zero', () => {
    for (const stat of aggregateByChord([])) {
      expect(stat.count).toBe(0)
      expect(stat.correct).toBe(0)
      expect(stat.accuracy).toBeNull()
      expect(stat.meanMs).toBeNull()
    }
  })

  it('counts wrong answers into the mean time', () => {
    const stats = aggregateByChord([
      attempt({ ms: 1000 }),
      attempt({ ms: 1200 }),
      attempt({ ms: 800 }),
      attempt({ ms: 2000, ok: false })
    ])

    const cMajor = stats.find(stat => stat.root === 0 && stat.q === 'major')!
    expect(cMajor.count).toBe(4)
    expect(cMajor.correct).toBe(3)
    expect(cMajor.accuracy).toBe(0.75)
    expect(cMajor.meanMs).toBe(1250)
  })

  it('keeps chords apart by root and by quality', () => {
    const stats = aggregateByChord([
      attempt({ root: 0, q: 'major' }),
      attempt({ root: 0, q: 'minor', ok: false }),
      attempt({ root: 7, q: 'major' })
    ])

    expect(stats.find(stat => stat.root === 0 && stat.q === 'major')!.count).toBe(1)
    expect(stats.find(stat => stat.root === 0 && stat.q === 'minor')!.correct).toBe(0)
    expect(stats.find(stat => stat.root === 7 && stat.q === 'major')!.count).toBe(1)
    expect(stats.filter(stat => stat.count > 0)).toHaveLength(3)
  })
})

describe('localDayKey', () => {
  it('pads month and day to two digits', () => {
    expect(localDayKey(at(2026, 8, 7))).toBe('2026-08-07')
    expect(localDayKey(at(2026, 12, 31))).toBe('2026-12-31')
  })

  it('splits on local midnight', () => {
    expect(localDayKey(at(2026, 8, 17, 23))).toBe('2026-08-17')
    expect(localDayKey(at(2026, 8, 18, 0))).toBe('2026-08-18')
  })
})

describe('previousDayKey', () => {
  it('steps back inside a month', () => {
    expect(previousDayKey('2026-08-17')).toBe('2026-08-16')
  })

  it('rolls over a month boundary', () => {
    expect(previousDayKey('2026-08-01')).toBe('2026-07-31')
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
  })

  it('knows about leap days', () => {
    expect(previousDayKey('2024-03-01')).toBe('2024-02-29')
  })

  it('rolls over a year boundary', () => {
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31')
  })
})

describe('daysFromAttempts', () => {
  it('buckets a log into ascending daily rows', () => {
    const days = daysFromAttempts([
      attempt({ t: at(2026, 8, 15) }),
      attempt({ t: at(2026, 8, 15), ok: false }),
      attempt({ t: at(2026, 8, 17) }),
      attempt({ t: at(2026, 8, 16) })
    ])

    expect(days).toEqual([
      { d: '2026-08-15', count: 2, correct: 1 },
      { d: '2026-08-16', count: 1, correct: 1 },
      { d: '2026-08-17', count: 1, correct: 1 }
    ])
  })

  it('has nothing to seed from an empty log', () => {
    expect(daysFromAttempts([])).toEqual([])
  })
})

describe('computeDayStreak', () => {
  it('is zero with no history at all', () => {
    expect(computeDayStreak([], '2026-08-17')).toEqual({ length: 0, activeToday: false })
  })

  it('counts today on its own as one', () => {
    expect(computeDayStreak([day('2026-08-17')], '2026-08-17'))
      .toEqual({ length: 1, activeToday: true })
  })

  it('counts a run ending today', () => {
    const days = [day('2026-08-15'), day('2026-08-16'), day('2026-08-17')]
    expect(computeDayStreak(days, '2026-08-17')).toEqual({ length: 3, activeToday: true })
  })

  it('holds a run that is only waiting on today', () => {
    const days = [day('2026-08-14'), day('2026-08-15'), day('2026-08-16')]
    expect(computeDayStreak(days, '2026-08-17')).toEqual({ length: 3, activeToday: false })
  })

  it('drops a run that stopped the day before yesterday', () => {
    const days = [day('2026-08-14'), day('2026-08-15')]
    expect(computeDayStreak(days, '2026-08-17')).toEqual({ length: 0, activeToday: false })
  })

  it('counts back only as far as the first missed day', () => {
    const days = [day('2026-08-10'), day('2026-08-11'), day('2026-08-16'), day('2026-08-17')]
    expect(computeDayStreak(days, '2026-08-17')).toEqual({ length: 2, activeToday: true })
  })

  it('ignores a day that was played but never answered right', () => {
    const days = [day('2026-08-16'), day('2026-08-17', 0, 5)]
    expect(computeDayStreak(days, '2026-08-17')).toEqual({ length: 1, activeToday: false })
  })

  it('counts across a month boundary', () => {
    const days = [day('2026-07-30'), day('2026-07-31'), day('2026-08-01')]
    expect(computeDayStreak(days, '2026-08-01')).toEqual({ length: 3, activeToday: true })
  })
})

describe('formatters', () => {
  it('renders a dash before there is anything to show', () => {
    expect(formatSeconds(null)).toBe('—')
    expect(formatPercent(null)).toBe('—')
    expect(formatSeconds(Number.NaN)).toBe('—')
  })

  it('renders seconds to two places and accuracy as a whole percent', () => {
    expect(formatSeconds(1240)).toBe('1.24 s')
    expect(formatPercent(0.755)).toBe('76 %')
    expect(formatPercent(1)).toBe('100 %')
  })
})
