import { computed, onScopeDispose, readonly, ref, shallowRef, triggerRef } from 'vue'
import { toPitchClass, type PitchClass } from './useTheory'

/**
 * Web MIDI input. Client-only — call this from a component that never runs on
 * the server.
 *
 * The four states are kept apart on purpose. "No MIDI" has three very different
 * causes and only one of them is worth acting on:
 *   unsupported — the browser has no Web MIDI at all (Firefox, Safari)
 *   denied      — the permission prompt was refused
 *   no-device   — the API works, nothing is plugged in
 */
export type MidiState = 'idle' | 'unsupported' | 'denied' | 'no-device' | 'ready'

export interface MidiInputInfo {
  id: string
  name: string
}

const NOTE_OFF = 0x80
const NOTE_ON = 0x90
const CONTROL_CHANGE = 0xb0
const ALL_NOTES_OFF = 123
const ALL_SOUND_OFF = 120

export function useMidi(onNote?: (midiNote: number) => void) {
  const state = ref<MidiState>('idle')
  const inputs = ref<MidiInputInfo[]>([])
  const selectedId = ref<string | null>(null)

  /**
   * Raw MIDI note numbers currently down. Kept raw rather than reduced so a
   * note-off for C4 doesn't release a C5 that's still held.
   */
  const heldNotes = shallowRef(new Set<number>())

  let access: MIDIAccess | null = null
  const bound = new Set<MIDIInput>()

  /** Pitch classes currently sounding. Two `do` two octaves apart count once. */
  const heldPitchClasses = computed(() => {
    const set = new Set<PitchClass>()
    for (const note of heldNotes.value) set.add(toPitchClass(note))
    return set
  })

  function clearHeld() {
    if (heldNotes.value.size === 0) return
    heldNotes.value.clear()
    triggerRef(heldNotes)
  }

  function handleMessage(event: MIDIMessageEvent) {
    const data = event.data
    if (!data || data.length < 2) return

    const command = data[0]! & 0xf0
    const note = data[1]!
    const velocity = data.length > 2 ? data[2]! : 0

    // A note-on with velocity 0 is a note-off. Plenty of keyboards send that
    // instead of a real 0x80, so both paths have to be handled.
    const isNoteOn = command === NOTE_ON && velocity > 0
    const isNoteOff = command === NOTE_OFF || (command === NOTE_ON && velocity === 0)

    if (isNoteOn) {
      if (!heldNotes.value.has(note)) {
        heldNotes.value.add(note)
        triggerRef(heldNotes)
        onNote?.(note)
      }
      return
    }

    if (isNoteOff) {
      if (heldNotes.value.delete(note)) triggerRef(heldNotes)
      return
    }

    // Panic messages: some controllers fire these on transport stop, and
    // honouring them is the cheapest guard against a stuck note.
    if (command === CONTROL_CHANGE && (note === ALL_NOTES_OFF || note === ALL_SOUND_OFF)) {
      clearHeld()
    }
  }

  function unbindAll() {
    for (const input of bound) input.onmidimessage = null
    bound.clear()
  }

  function bindSelected() {
    unbindAll()
    if (!access) return

    const input = selectedId.value ? access.inputs.get(selectedId.value) : undefined
    if (!input) return

    input.onmidimessage = handleMessage as (event: MIDIMessageEvent) => void
    bound.add(input)
  }

  function refreshInputs() {
    if (!access) return

    inputs.value = [...access.inputs.values()].map(input => ({
      id: input.id,
      name: input.name || input.manufacturer || 'MIDI input'
    }))

    if (inputs.value.length === 0) {
      selectedId.value = null
      unbindAll()
      clearHeld()
      state.value = 'no-device'
      return
    }

    // Keep the current pick if it survived the topology change, otherwise fall
    // back to the first device so a hot-plug just works.
    const stillThere = inputs.value.some(input => input.id === selectedId.value)
    if (!stillThere) {
      selectedId.value = inputs.value[0]!.id
      clearHeld()
    }

    state.value = 'ready'
    bindSelected()
  }

  function selectInput(id: string) {
    selectedId.value = id
    clearHeld()
    bindSelected()
  }

  async function start() {
    if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
      state.value = 'unsupported'
      return
    }

    try {
      access = await navigator.requestMIDIAccess({ sysex: false })
    } catch {
      // Rejection covers both a refused prompt and a blocked permission policy.
      state.value = 'denied'
      return
    }

    access.onstatechange = refreshInputs
    refreshInputs()
  }

  onScopeDispose(() => {
    unbindAll()
    if (access) access.onstatechange = null
    access = null
  })

  return {
    state: readonly(state),
    inputs: readonly(inputs),
    selectedId,
    heldNotes: readonly(heldNotes),
    heldPitchClasses,
    start,
    selectInput,
    clearHeld
  }
}
