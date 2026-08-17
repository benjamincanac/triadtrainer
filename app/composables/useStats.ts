import { computed, ref } from 'vue'
import { readStored, removeStored, writeStored } from './useStorage'
import {
  allChords,
  INVERSION_NAMES,
  type Chord,
  type InversionName,
  type PitchClass,
  type Quality
} from './useTheory'

/**
 * Reaction time is the metric, not the score. The chrono starts when a chord is
 * displayed and stops at validation, right or wrong — a wrong answer retries the
 * same chord, so both halves of "how long did that actually take me" are counted.
 */
const ATTEMPTS_KEY = 'triadtrainer.attempts.v1'
const SESSIONS_KEY = 'triadtrainer.sessions.v1'
const DAYS_KEY = 'triadtrainer.days.v1'
const LEGACY_ATTEMPTS_KEY = 'subito.attempts.v1'
const LEGACY_SESSIONS_KEY = 'subito.sessions.v1'

/** Enough recent detail for the rolling numbers without unbounded growth. */
const MAX_ATTEMPTS = 500
/** Per-session aggregates outlive the raw log, so weeks of history stay small. */
const MAX_SESSIONS = 200
/** A year of daily rows, which also caps the streak the panel can display. */
const MAX_DAYS = 366

const ROLLING_WINDOW = 10

/**
 * Correct answers to aim for in a day. A single one is enough to keep the
 * streak alive; this is the target sitting on top of it.
 */
export const DAILY_GOAL = 20

export interface Attempt {
  /** epoch ms */
  t: number
  /** reaction time in ms */
  ms: number
  ok: boolean
  root: number
  q: Quality
  /** Set only when the prompt named an inversion and the bass note was graded. */
  inv?: InversionName
  /** Set only for ear training. Absent means the chord was named on screen. */
  mode?: 'ear'
}

/** One local calendar day of practice. */
export interface DayRecord {
  /** `YYYY-MM-DD`, local time. */
  d: string
  count: number
  correct: number
}

/** How one of the 24 chords is going, over the attempts still on file. */
export interface ChordStat {
  root: PitchClass
  q: Quality
  count: number
  correct: number
  /** null until the chord has been drilled at all. */
  accuracy: number | null
  meanMs: number | null
}

export interface SessionSummary {
  id: string
  startedAt: number
  /** Last attempt in this session, used to decide whether a reload resumes it. */
  lastAt: number
  count: number
  correct: number
  meanMs: number
}

/**
 * A reload shouldn't start a new point on the curve — you'd get five sessions
 * out of five refreshes. Anything within the gap continues the last one.
 */
const SESSION_GAP = 30 * 60 * 1000

const attempts = ref<Attempt[]>([])
const sessions = ref<SessionSummary[]>([])
const days = ref<DayRecord[]>([])
const sessionId = ref<string>('')
let initialized = false

function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false
  const a = value as Partial<Attempt>
  return typeof a.t === 'number'
    && typeof a.ms === 'number'
    && typeof a.ok === 'boolean'
    && typeof a.root === 'number'
    && (a.q === 'major' || a.q === 'minor')
    // Both optional on purpose. New fields have to leave rows written before
    // they existed readable, which is what keeps the key at v1.
    && (a.inv === undefined || INVERSION_NAMES.includes(a.inv))
    && (a.mode === undefined || a.mode === 'ear')
}

function isDayRecord(value: unknown): value is DayRecord {
  if (!value || typeof value !== 'object') return false
  const d = value as Partial<DayRecord>
  return typeof d.d === 'string'
    && typeof d.count === 'number'
    && typeof d.correct === 'number'
}

function isSession(value: unknown): value is SessionSummary {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<SessionSummary>
  return typeof s.id === 'string'
    && typeof s.startedAt === 'number'
    && typeof s.count === 'number'
    && typeof s.correct === 'number'
    && typeof s.meanMs === 'number'
}

/** Migrate rows written before `lastAt` existed. */
function withLastAt(session: SessionSummary): SessionSummary {
  return typeof session.lastAt === 'number' ? session : { ...session, lastAt: session.startedAt }
}

/* -------------------------------------------------------------------------- */
/* Derivations                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Per-chord totals over the attempts still on file. Always 24 rows in
 * `allChords()` order, chords never played included, so a grid can render
 * straight from this without filling the gaps itself.
 *
 * The attempt log is capped, which makes this recent form rather than a
 * lifetime record: a chord drilled to death months ago and left alone reads
 * empty again. That is the useful answer to "what should I practise now".
 */
export function aggregateByChord(list: Attempt[]): ChordStat[] {
  const totals = new Map<string, { count: number, correct: number, ms: number }>()

  for (const attempt of list) {
    const key = `${attempt.root}:${attempt.q}`
    const row = totals.get(key) ?? { count: 0, correct: 0, ms: 0 }
    row.count++
    if (attempt.ok) row.correct++
    row.ms += attempt.ms
    totals.set(key, row)
  }

  return allChords().map(chord => {
    const row = totals.get(`${chord.root}:${chord.quality}`)
    return {
      root: chord.root,
      q: chord.quality,
      count: row?.count ?? 0,
      correct: row?.correct ?? 0,
      accuracy: row ? row.correct / row.count : null,
      // Wrong answers count towards the mean. The time they cost is real time.
      meanMs: row ? row.ms / row.count : null
    }
  })
}

/** `YYYY-MM-DD` for a timestamp, in the local timezone. */
export function localDayKey(t: number): string {
  const date = new Date(t)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * The day before a key. Anchored at midday so an hour lost or gained to DST
 * can't land the result on the wrong side of midnight. Date itself handles
 * month and year rollover, leap days included.
 */
export function previousDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return localDayKey(new Date(year!, month! - 1, day! - 1, 12).getTime())
}

/**
 * Bucket an attempt log into daily rows. Only used to seed the day history the
 * first time it is read, so an existing user doesn't start from a zero streak.
 * The attempt cap means the oldest day it reconstructs may be short a few.
 */
export function daysFromAttempts(list: Attempt[]): DayRecord[] {
  const byDay = new Map<string, DayRecord>()

  for (const attempt of list) {
    const key = localDayKey(attempt.t)
    const row = byDay.get(key) ?? { d: key, count: 0, correct: 0 }
    row.count++
    if (attempt.ok) row.correct++
    byDay.set(key, row)
  }

  return [...byDay.values()].sort((a, b) => a.d.localeCompare(b.d))
}

export interface DayStreak {
  length: number
  /** Whether today is already on the board, or the run is waiting on it. */
  activeToday: boolean
}

/** What the prompt asked for beyond the chord itself. */
export interface AttemptContext {
  /** The inversion that was named, when one was. */
  inversion?: InversionName | null
  ear?: boolean
}

/**
 * Consecutive days counted back from today, or from yesterday when today has
 * nothing on it yet. One correct answer puts a day on the board.
 *
 * Anchoring on yesterday is what makes the number readable in the morning: a
 * run of twelve days reads as twelve waiting on today, not as a broken streak
 * that repairs itself the moment you play a chord.
 */
export function computeDayStreak(list: DayRecord[], todayKey: string): DayStreak {
  const practised = new Set(list.filter(day => day.correct > 0).map(day => day.d))

  const activeToday = practised.has(todayKey)
  let cursor = activeToday ? todayKey : previousDayKey(todayKey)

  let length = 0
  while (practised.has(cursor) && length < MAX_DAYS) {
    length++
    cursor = previousDayKey(cursor)
  }

  return { length, activeToday }
}

export function useStats() {
  if (import.meta.client && !initialized) {
    initialized = true
    attempts.value = readStored<unknown[]>(ATTEMPTS_KEY, [], LEGACY_ATTEMPTS_KEY).filter(isAttempt)
    sessions.value = readStored<unknown[]>(SESSIONS_KEY, [], LEGACY_SESSIONS_KEY).filter(isSession).map(withLastAt)
    days.value = readStored<unknown[]>(DAYS_KEY, []).filter(isDayRecord)

    // The day log arrived after the attempt log. Rebuild it once from whatever
    // attempts are still on file, so an existing user doesn't open the app on a
    // zero streak they haven't actually broken.
    if (days.value.length === 0 && attempts.value.length > 0) {
      days.value = daysFromAttempts(attempts.value)
      writeStored(DAYS_KEY, days.value)
    }

    // Resume the last session if it's still warm, so a reload doesn't fragment
    // one practice run into several points on the curve.
    const latest = sessions.value.at(-1)
    sessionId.value = latest && Date.now() - latest.lastAt < SESSION_GAP
      ? latest.id
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  /** Time of the most recent attempt. */
  const lastMs = computed(() => attempts.value.at(-1)?.ms ?? null)

  /** Mean over the last 10 attempts. */
  const rollingMs = computed(() => {
    const window = attempts.value.slice(-ROLLING_WINDOW)
    if (window.length === 0) return null
    return window.reduce((sum, attempt) => sum + attempt.ms, 0) / window.length
  })

  /** Consecutive correct answers, counted back from the most recent attempt. */
  const streak = computed(() => {
    let count = 0
    for (let i = attempts.value.length - 1; i >= 0; i--) {
      if (!attempts.value[i]!.ok) break
      count++
    }
    return count
  })

  const accuracy = computed(() => {
    if (attempts.value.length === 0) return null
    const correct = attempts.value.filter(attempt => attempt.ok).length
    return correct / attempts.value.length
  })

  const total = computed(() => attempts.value.length)

  /** The row for the tab that's open right now, if it has any attempts yet. */
  const currentSession = computed(() =>
    sessions.value.find(session => session.id === sessionId.value) ?? null
  )

  /** All 24 chords, ordered, however few of them have been played. */
  const perChord = computed(() => aggregateByChord(attempts.value))

  /**
   * Read off `Date.now()` rather than a timer: a tab left open across midnight
   * keeps showing yesterday's day until the next answer, which is the moment
   * the number matters again anyway.
   */
  const dayStreak = computed(() => computeDayStreak(days.value, localDayKey(Date.now())))

  const todayCorrect = computed(() =>
    days.value.find(day => day.d === localDayKey(Date.now()))?.correct ?? 0
  )

  function record(chord: Chord, ms: number, ok: boolean, context: AttemptContext = {}) {
    const attempt: Attempt = {
      t: Date.now(),
      ms,
      ok,
      root: chord.root,
      q: chord.quality,
      // Spread in rather than set to null: absent is exactly what a row written
      // before these existed looks like, and every reader already handles that.
      ...(context.inversion ? { inv: context.inversion } : {}),
      ...(context.ear ? { mode: 'ear' as const } : {})
    }

    attempts.value = [...attempts.value, attempt].slice(-MAX_ATTEMPTS)
    writeStored(ATTEMPTS_KEY, attempts.value)

    // Upsert the session row on every attempt rather than on unload, so closing
    // the tab never loses the session.
    const existing = sessions.value.find(session => session.id === sessionId.value)
    if (existing) {
      const count = existing.count + 1
      const updated: SessionSummary = {
        ...existing,
        lastAt: attempt.t,
        count,
        correct: existing.correct + (ok ? 1 : 0),
        meanMs: (existing.meanMs * existing.count + ms) / count
      }
      sessions.value = sessions.value.map(session => (session.id === updated.id ? updated : session))
    } else {
      sessions.value = [
        ...sessions.value,
        {
          id: sessionId.value,
          startedAt: attempt.t,
          lastAt: attempt.t,
          count: 1,
          correct: ok ? 1 : 0,
          meanMs: ms
        }
      ].slice(-MAX_SESSIONS)
    }

    writeStored(SESSIONS_KEY, sessions.value)

    // Found by day key rather than by position, so a clock that moves backwards
    // updates the right row instead of appending a second one for the same date.
    const dayKey = localDayKey(attempt.t)
    const today = days.value.find(day => day.d === dayKey)
    const updated = today
      ? days.value.map(day => (day.d === dayKey
          ? { ...day, count: day.count + 1, correct: day.correct + (ok ? 1 : 0) }
          : day))
      : [...days.value, { d: dayKey, count: 1, correct: ok ? 1 : 0 }]

    days.value = updated.sort((a, b) => a.d.localeCompare(b.d)).slice(-MAX_DAYS)
    writeStored(DAYS_KEY, days.value)
  }

  function reset() {
    attempts.value = []
    sessions.value = []
    days.value = []
    removeStored(ATTEMPTS_KEY)
    removeStored(SESSIONS_KEY)
    removeStored(DAYS_KEY)
  }

  return {
    attempts,
    sessions,
    days,
    sessionId,
    currentSession,
    lastMs,
    rollingMs,
    streak,
    accuracy,
    total,
    perChord,
    dayStreak,
    todayCorrect,
    record,
    reset
  }
}

/** `1.24 s`, or `—` before the first attempt. */
export function formatSeconds(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—'
  return `${(ms / 1000).toFixed(2)} s`
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return '—'
  return `${Math.round(ratio * 100)} %`
}
