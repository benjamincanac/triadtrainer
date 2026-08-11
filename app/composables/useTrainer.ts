import { computed, onScopeDispose, ref, watch } from 'vue'
import { useMidi } from './useMidi'
import { useSettings } from './useSettings'
import { useStats } from './useStats'
import { useSynth } from './useSynth'
import {
  chordPitchClasses,
  chordPool,
  matchesTriad,
  pickChord,
  sameChord,
  toPitchClass,
  type Chord,
  type PitchClass
} from './useTheory'

/** Right answers roll straight on; wrong ones hold long enough to read. */
const ADVANCE_DELAY = 750
const REVEAL_DELAY = 1400

export type Phase = 'awaiting' | 'correct' | 'wrong'

/** What a key's lamp is doing. */
export type LampState = 'off' | 'selected' | 'correct' | 'wrong' | 'revealed'

export function useTrainer() {
  const { settings } = useSettings()
  const stats = useStats()
  const synth = useSynth()
  const midi = useMidi(note => synth.play(note))

  const current = ref<Chord | null>(null)
  const phase = ref<Phase>('awaiting')

  /**
   * Clicked keys latch (you can't hold three with one pointer) while MIDI notes
   * are transient. The union of the two is the answer, which is what makes the
   * two input modes interchangeable.
   */
  const clicked = ref<Set<PitchClass>>(new Set())

  /**
   * What was actually played at the moment of validation. Frozen because the
   * lamps have to keep showing the verdict after the keys are released.
   */
  const answered = ref<Set<PitchClass>>(new Set())

  /**
   * Guards against a chord still being held when the next prompt appears, which
   * would otherwise validate it instantly. Re-arms once fewer than three notes
   * are down.
   */
  const armed = ref(true)

  let startedAt = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const pool = computed(() =>
    chordPool({
      quality: settings.value.quality,
      whiteRootsOnly: settings.value.whiteRootsOnly
    })
  )

  const selected = computed(() => {
    const set = new Set(clicked.value)
    for (const pitchClass of midi.heldPitchClasses.value) set.add(pitchClass)
    return set
  })

  const target = computed(() =>
    current.value ? new Set(chordPitchClasses(current.value)) : new Set<PitchClass>()
  )

  const verdict = computed(() => {
    if (phase.value === 'correct') return 'Correct'
    if (phase.value === 'wrong') return 'Wrong — the answer is lit on the keys'
    return ''
  })

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  /** Arm only once the hands are off the keys, then start the chrono. */
  function rearm() {
    clicked.value = new Set()
    answered.value = new Set()
    phase.value = 'awaiting'
    startedAt = performance.now()
    armed.value = selected.value.size < 3
  }

  function next() {
    clearTimer()

    if (settings.value.order === 'sequential') {
      const list = pool.value
      if (list.length === 0) {
        current.value = null
      } else {
        // Resume from wherever the current chord sits, so switching to ordered
        // mode mid-session carries on rather than jumping back to C.
        const at = current.value ? list.findIndex(chord => sameChord(chord, current.value)) : -1
        current.value = list[(at + 1) % list.length]!
      }
    } else {
      current.value = pickChord(pool.value, current.value)
    }

    rearm()
  }

  /** Same chord again after a miss. */
  function retry() {
    clearTimer()
    rearm()
  }

  function evaluate() {
    const chord = current.value
    if (!chord) return

    const ms = performance.now() - startedAt
    const played = new Set(selected.value)
    const ok = matchesTriad(played, chord)

    answered.value = played
    phase.value = ok ? 'correct' : 'wrong'
    stats.record(chord, ms, ok)

    clearTimer()
    timer = setTimeout(ok ? next : retry, ok ? ADVANCE_DELAY : REVEAL_DELAY)
  }

  watch(selected, set => {
    if (phase.value !== 'awaiting') return

    if (!armed.value) {
      if (set.size < 3) armed.value = true
      return
    }

    // Three distinct pitch classes held at once is the trigger, however they got there.
    if (set.size === 3) evaluate()
  })

  // Narrowing the pool can strand the current prompt outside it.
  watch(pool, list => {
    if (current.value && !list.some(chord => sameChord(chord, current.value))) next()
  })

  /** A click is a note: same sound, same effect on the answer. */
  function pressKey(midiNote: number) {
    synth.unlock()
    synth.play(midiNote)

    if (phase.value !== 'awaiting') return

    const pitchClass = toPitchClass(midiNote)
    const updated = new Set(clicked.value)
    if (updated.has(pitchClass)) updated.delete(pitchClass)
    else updated.add(pitchClass)
    clicked.value = updated
  }

  function lampFor(pitchClass: PitchClass): LampState {
    if (phase.value === 'awaiting') {
      return selected.value.has(pitchClass) ? 'selected' : 'off'
    }

    const wasPlayed = answered.value.has(pitchClass)
    const inTarget = target.value.has(pitchClass)

    if (wasPlayed) return inTarget ? 'correct' : 'wrong'
    if (phase.value === 'wrong' && inTarget) return 'revealed'
    return 'off'
  }

  async function start() {
    next()
    await midi.start()
  }

  onScopeDispose(clearTimer)

  return {
    settings,
    stats,
    midi,
    current,
    phase,
    verdict,
    selected,
    pool,
    lampFor,
    pressKey,
    next,
    start
  }
}
