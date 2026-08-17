import { ref, watch } from 'vue'
import { readStored, writeStored } from './useStorage'
import { DEFAULT_ACCIDENTALS, type Accidentals, type QualityFilter } from './useTheory'

const ACCIDENTALS: Accidentals[] = ['sharps', 'flats', 'both']

/** Random keeps you honest; ordered is for first learning the shapes. */
export type DrillOrder = 'random' | 'sequential'

/**
 * Drill asks for chords, ear plays one for you to find by sound, explore names
 * whatever you play.
 */
export type Mode = 'drill' | 'explore' | 'ear'

const MODES: Mode[] = ['drill', 'explore', 'ear']

const STORAGE_KEY = 'triadtrainer.settings.v1'
const LEGACY_STORAGE_KEY = 'subito.settings.v1'

export interface Settings {
  /** Which triads the drill draws from. */
  quality: QualityFilter
  /** Blank the key caps — the point is to stop reading and start hearing. */
  hideNames: boolean
  /** Beginner mode: roots on white keys only. */
  whiteRootsOnly: boolean
  /** How black keys are spelled, in the prompt and on the key caps alike. */
  accidentals: Accidentals
  /** Draw chords at random, or walk the pool in order. */
  order: DrillOrder
  /** Name an inversion in the prompt and grade the bass note, not just the set. */
  inversions: boolean
  /** What the home page does. */
  mode: Mode
}

const DEFAULTS: Settings = {
  quality: 'both',
  hideNames: false,
  whiteRootsOnly: false,
  accidentals: DEFAULT_ACCIDENTALS,
  order: 'random',
  inversions: false,
  mode: 'drill'
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
    whiteRootsOnly: typeof value.whiteRootsOnly === 'boolean' ? value.whiteRootsOnly : DEFAULTS.whiteRootsOnly,
    accidentals: value.accidentals && ACCIDENTALS.includes(value.accidentals)
      ? value.accidentals
      : DEFAULTS.accidentals,
    order: value.order === 'random' || value.order === 'sequential'
      ? value.order
      : DEFAULTS.order,
    inversions: typeof value.inversions === 'boolean' ? value.inversions : DEFAULTS.inversions,
    mode: value.mode && MODES.includes(value.mode) ? value.mode : DEFAULTS.mode
  }
}

export function useSettings() {
  // Read on the client only, so SSR renders the defaults and hydration matches.
  if (import.meta.client && !initialized) {
    initialized = true
    settings.value = sanitize(readStored<Partial<Settings> | null>(STORAGE_KEY, null, LEGACY_STORAGE_KEY))
    watch(settings, value => writeStored(STORAGE_KEY, value), { deep: true })
  }

  function reset() {
    settings.value = { ...DEFAULTS }
  }

  return { settings, reset }
}
