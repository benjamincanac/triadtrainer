import { ref, watch } from 'vue'
import { readStored, writeStored } from './useStorage'
import type { QualityFilter } from './useTheory'

const STORAGE_KEY = 'piano.settings.v1'

export interface Settings {
  /** Which triads the drill draws from. */
  quality: QualityFilter
  /** Blank the key caps — the point is to stop reading and start hearing. */
  hideNames: boolean
  /** Beginner mode: roots on white keys only. */
  whiteRootsOnly: boolean
}

const DEFAULTS: Settings = {
  quality: 'both',
  hideNames: false,
  whiteRootsOnly: false
}

// App-lifetime singleton so the settings panel and the drill share one object.
const settings = ref<Settings>({ ...DEFAULTS })
let initialized = false

function sanitize(value: Partial<Settings> | null): Settings {
  if (!value || typeof value !== 'object') return { ...DEFAULTS }
  return {
    quality: value.quality === 'major' || value.quality === 'minor' || value.quality === 'both'
      ? value.quality
      : DEFAULTS.quality,
    hideNames: typeof value.hideNames === 'boolean' ? value.hideNames : DEFAULTS.hideNames,
    whiteRootsOnly: typeof value.whiteRootsOnly === 'boolean' ? value.whiteRootsOnly : DEFAULTS.whiteRootsOnly
  }
}

export function useSettings() {
  // Read on the client only, so SSR renders the defaults and hydration matches.
  if (import.meta.client && !initialized) {
    initialized = true
    settings.value = sanitize(readStored<Partial<Settings> | null>(STORAGE_KEY, null))
    watch(settings, value => writeStored(STORAGE_KEY, value), { deep: true })
  }

  function reset() {
    settings.value = { ...DEFAULTS }
  }

  return { settings, reset }
}
