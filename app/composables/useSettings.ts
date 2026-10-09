import { ref, watch } from 'vue'
import { readStored, writeStored } from './useStorage'
import {
  DEFAULT_ACCIDENTALS,
  DEFAULT_NAMING,
  type Accidentals,
  type Alterations,
  type ClefFilter,
  type Naming,
  type QualityFilter
} from './useTheory'

const ACCIDENTALS: Accidentals[] = ['sharps', 'flats', 'both']

/** Random keeps you honest; ordered is for first learning the shapes. */
export type DrillOrder = 'random' | 'sequential'

/**
 * Drill asks for chords, ear plays one for you to find by sound, explore names
 * whatever you play.
 */
export type Mode = 'drill' | 'explore' | 'ear'

const MODES: Mode[] = ['drill', 'explore', 'ear']

/**
 * What the drill asks for: a chord held at once, a scale run note by note, or
 * one note read off a staff.
 */
export type Exercise = 'triads' | 'scales' | 'notes'

const EXERCISES: Exercise[] = ['triads', 'scales', 'notes']

/**
 * What the board's tab row shows: the drill split by exercise, then the two
 * other modes. A view over `mode` and `exercise`, not a third stored field.
 */
export type Tab = Exercise | 'ear' | 'explore'

const TABS: Tab[] = ['triads', 'scales', 'notes', 'ear', 'explore']

/**
 * The settings more than one tab reads. Each tab keeps its own copy, so going
 * in order through the notes doesn't put the triads in order too.
 */
export interface TabSettings {
  quality: QualityFilter
  order: DrillOrder
  whiteRootsOnly: boolean
}

const CLEFS: ClefFilter[] = ['treble', 'bass', 'both']

/** One note is a flashcard; four or eight are a bar or two to read through. */
export type LineLength = 1 | 4 | 8

const LINE_LENGTHS: LineLength[] = [1, 4, 8]

const ALTERATIONS: Alterations[] = ['none', 'flats', 'sharps', 'both']

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
  /** C D E or do ré mi, everywhere a note is named. */
  naming: Naming
  /** Draw chords at random, or walk the pool in order. */
  order: DrillOrder
  /** Name an inversion in the prompt and grade the bass note, not just the set. */
  inversions: boolean
  /**
   * Ear training: say what the chord was after a miss too. Off by default,
   * because a miss retries the same chord and being told first gives it away.
   * A right answer names it regardless: the drill has already moved on.
   */
  revealName: boolean
  /**
   * Voice the notes coming in over MIDI. On for a silent controller, off for a
   * digital piano that already makes its own sound.
   */
  echoMidi: boolean
  /** What the home page does. */
  mode: Mode
  /** What the drill practises. Ear and explore stay triads regardless. */
  exercise: Exercise
  /** Which staves the reading drill writes its notes on. */
  clef: ClefFilter
  /** How many notes the reading drill writes per prompt, played in order. */
  lineLength: LineLength
  /** Whether the reading drill writes sharps and flats, and which. */
  alterations: Alterations
  /** Print finger numbers under a line of notes. */
  fingering: boolean
  /**
   * What every tab had `quality`, `order` and `whiteRootsOnly` set to when it
   * was last left. The flat fields above stay the live values for the open
   * tab, which is what lets the drill read them without knowing about tabs,
   * so the open tab's own entry here is only as fresh as the last switch.
   */
  perTab: Record<Tab, TabSettings>
}

function shared(value: TabSettings): TabSettings {
  return { quality: value.quality, order: value.order, whiteRootsOnly: value.whiteRootsOnly }
}

/** The same copy for every tab, which is how a fresh or migrated row starts. */
function everyTab(value: TabSettings): Record<Tab, TabSettings> {
  return Object.fromEntries(TABS.map(tab => [tab, shared(value)])) as Record<Tab, TabSettings>
}

const DEFAULT_SHARED: TabSettings = { quality: 'both', order: 'random', whiteRootsOnly: false }

const DEFAULTS: Settings = {
  quality: 'both',
  hideNames: false,
  whiteRootsOnly: false,
  accidentals: DEFAULT_ACCIDENTALS,
  naming: DEFAULT_NAMING,
  order: 'random',
  inversions: false,
  revealName: false,
  echoMidi: true,
  mode: 'drill',
  exercise: 'triads',
  clef: 'both',
  lineLength: 1,
  alterations: 'none',
  fingering: true,
  perTab: everyTab(DEFAULT_SHARED)
}

// App-lifetime singleton so the settings panel and the drill share one object.
const settings = ref<Settings>({ ...DEFAULTS })
let initialized = false

export function tabOf(value: Pick<Settings, 'mode' | 'exercise'>): Tab {
  return value.mode === 'drill' ? value.exercise : value.mode
}

/**
 * Open another tab: put away what the one being left had, and bring back what
 * the one being opened had. Pure, so the swap is testable without a browser.
 */
export function withTab(value: Settings, tab: Tab): Settings {
  const from = tabOf(value)
  if (from === tab) return value
  const perTab = { ...value.perTab, [from]: shared(value) }
  return {
    ...value,
    ...shared(perTab[tab]),
    perTab,
    ...(tab === 'ear' || tab === 'explore' ? { mode: tab } : { mode: 'drill' as const, exercise: tab })
  }
}

function sanitizeShared(value: Partial<TabSettings> | undefined, fallback: TabSettings): TabSettings {
  return {
    quality: value?.quality === 'major' || value?.quality === 'minor' || value?.quality === 'both'
      ? value.quality
      : fallback.quality,
    order: value?.order === 'random' || value?.order === 'sequential' ? value.order : fallback.order,
    whiteRootsOnly: typeof value?.whiteRootsOnly === 'boolean' ? value.whiteRootsOnly : fallback.whiteRootsOnly
  }
}

export function sanitize(value: Partial<Settings> | null): Settings {
  if (!value || typeof value !== 'object') return { ...DEFAULTS }
  const live = sanitizeShared(value, DEFAULT_SHARED)
  // A row written before tabs kept their own copy has no `perTab`. Every tab
  // then starts from what was set, so nobody's settings move on upgrade.
  const stored = value.perTab && typeof value.perTab === 'object' ? value.perTab : {} as Partial<Record<Tab, TabSettings>>
  return {
    ...live,
    perTab: Object.fromEntries(TABS.map(tab => [tab, sanitizeShared(stored[tab], live)])) as Record<Tab, TabSettings>,
    hideNames: typeof value.hideNames === 'boolean' ? value.hideNames : DEFAULTS.hideNames,
    accidentals: value.accidentals && ACCIDENTALS.includes(value.accidentals)
      ? value.accidentals
      : DEFAULTS.accidentals,
    naming: value.naming === 'letters' || value.naming === 'solfege' ? value.naming : DEFAULTS.naming,
    inversions: typeof value.inversions === 'boolean' ? value.inversions : DEFAULTS.inversions,
    revealName: typeof value.revealName === 'boolean' ? value.revealName : DEFAULTS.revealName,
    echoMidi: typeof value.echoMidi === 'boolean' ? value.echoMidi : DEFAULTS.echoMidi,
    mode: value.mode && MODES.includes(value.mode) ? value.mode : DEFAULTS.mode,
    exercise: value.exercise && EXERCISES.includes(value.exercise) ? value.exercise : DEFAULTS.exercise,
    clef: value.clef && CLEFS.includes(value.clef) ? value.clef : DEFAULTS.clef,
    lineLength: value.lineLength && LINE_LENGTHS.includes(value.lineLength) ? value.lineLength : DEFAULTS.lineLength,
    alterations: value.alterations && ALTERATIONS.includes(value.alterations) ? value.alterations : DEFAULTS.alterations,
    fingering: typeof value.fingering === 'boolean' ? value.fingering : DEFAULTS.fingering
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
