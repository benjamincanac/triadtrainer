import { computed, ref } from 'vue'
import { readStored, removeStored, writeStored } from './useStorage'
import type { Chord, Quality } from './useTheory'

/**
 * Reaction time is the metric, not the score. The chrono starts when a chord is
 * displayed and stops at validation, right or wrong — a wrong answer retries the
 * same chord, so both halves of "how long did that actually take me" are counted.
 */
const ATTEMPTS_KEY = 'piano.attempts.v1'
const SESSIONS_KEY = 'piano.sessions.v1'

/** Enough recent detail for the rolling numbers without unbounded growth. */
const MAX_ATTEMPTS = 500
/** Per-session aggregates outlive the raw log, so weeks of history stay small. */
const MAX_SESSIONS = 200

const ROLLING_WINDOW = 10

export interface Attempt {
  /** epoch ms */
  t: number
  /** reaction time in ms */
  ms: number
  ok: boolean
  root: number
  q: Quality
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

export function useStats() {
  if (import.meta.client && !initialized) {
    initialized = true
    attempts.value = readStored<unknown[]>(ATTEMPTS_KEY, []).filter(isAttempt)
    sessions.value = readStored<unknown[]>(SESSIONS_KEY, []).filter(isSession).map(withLastAt)

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

  function record(chord: Chord, ms: number, ok: boolean) {
    const attempt: Attempt = { t: Date.now(), ms, ok, root: chord.root, q: chord.quality }

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
  }

  function reset() {
    attempts.value = []
    sessions.value = []
    removeStored(ATTEMPTS_KEY)
    removeStored(SESSIONS_KEY)
  }

  return {
    attempts,
    sessions,
    sessionId,
    currentSession,
    lastMs,
    rollingMs,
    streak,
    accuracy,
    total,
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
