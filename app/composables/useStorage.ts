/**
 * localStorage that never throws. Private windows, disabled storage and quota
 * errors all just degrade to an in-memory session.
 */
export function readStored<T>(key: string, fallback: T, legacyKey?: string): T {
  if (typeof window === 'undefined') return fallback
  try {
    // The app was briefly called Subito. Fall back to the old key so practice
    // history survives the rename, and rewrite it under the new one.
    const raw = window.localStorage.getItem(key) ?? (legacyKey ? window.localStorage.getItem(legacyKey) : null)
    if (!raw) return fallback
    return JSON.parse(raw) as T
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
