/**
 * localStorage that never throws. Private windows, disabled storage and quota
 * errors all just degrade to an in-memory session.
 */
export function readStored<T>(key: string, fallback: T, legacyKey?: string): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T

    if (!legacyKey) return fallback
    const legacy = window.localStorage.getItem(legacyKey)
    if (!legacy) return fallback

    // The app was briefly called Subito. Carry that history over on first read
    // and drop the old key, so it doesn't stay load-bearing indefinitely.
    window.localStorage.setItem(key, legacy)
    window.localStorage.removeItem(legacyKey)
    return JSON.parse(legacy) as T
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage is full or blocked. Losing history is preferable to breaking the drill.
  }
}

export function removeStored(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
