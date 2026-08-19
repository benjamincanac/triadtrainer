import { computed, onScopeDispose, ref, watch } from 'vue'
import { useMidi } from './useMidi'
import { useSettings } from './useSettings'
import { useStats } from './useStats'
import { useSynth } from './useSynth'
import {
  chordPitchClasses,
  chordPool,
  identifyTriad,
  inversionBass,
  inversions,
  matchesInversion,
  matchesTriad,
  nextInversion,
  noteName,
  pickChord,
  pickInversion,
  sameChord,
  toPitchClass,
  type Chord,
  type InversionName,
  type PitchClass
} from './useTheory'

/** Right answers roll straight on; wrong ones hold long enough to read. */
const ADVANCE_DELAY = 750
const REVEAL_DELAY = 1400
/** Ear training names the chord on the way out, so a right answer has to be read too. */
const EAR_ADVANCE_DELAY = 1600
/** An answer you asked for is being studied, not glanced at. */
const ANSWER_DELAY = 2500

export type Phase = 'awaiting' | 'correct' | 'wrong' | 'revealed'

/** What a key's lamp is doing. */
export type LampState = 'off' | 'selected' | 'correct' | 'wrong' | 'revealed'

export function useTrainer() {
  const { settings } = useSettings()
  const stats = useStats()
  const synth = useSynth()
  // Incoming MIDI is voiced by the app, which is what makes a silent controller
  // playable. An instrument with a voice of its own would only be doubled.
  const midi = useMidi((note) => {
    if (settings.value.echoMidi) synth.play(note)
  })

  const current = ref<Chord | null>(null)
  const phase = ref<Phase>('awaiting')

  /**
   * Which inversion the prompt is asking for, or null when the grade is the
   * pitch class set alone and any voicing counts.
   */
  const currentInversion = ref<InversionName | null>(null)

  /** The three right notes under the wrong one. A different miss, said so. */
  const wrongBass = ref(false)

  /**
   * Clicked keys latch (you can't hold three with one pointer) while MIDI notes
   * are transient. The union of the two is the answer, which is what makes the
   * two input modes interchangeable.
   *
   * Stored as MIDI note numbers rather than pitch classes: explore mode reads
   * the inversion off the lowest note, and collapsing to a set loses that.
   */
  const clicked = ref<Set<number>>(new Set())

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

  /**
   * Ear training ignores the setting: finding the chord by sound is the whole
   * exercise, and asking for a voicing on top of it is a different drill.
   */
  const drillsInversions = computed(() =>
    settings.value.inversions && settings.value.mode === 'drill'
  )

  /** Everything currently down, as MIDI notes. */
  const selectedNotes = computed(() => {
    const set = new Set(clicked.value)
    for (const note of midi.heldNotes.value) set.add(note)
    return set
  })

  const selected = computed(() => {
    const set = new Set<PitchClass>()
    for (const note of selectedNotes.value) set.add(toPitchClass(note))
    return set
  })

  /** Explore mode: name whatever is being held, inversion included. */
  const identified = computed(() => identifyTriad(selectedNotes.value))

  const target = computed(() =>
    current.value ? new Set(chordPitchClasses(current.value)) : new Set<PitchClass>()
  )

  const verdict = computed(() => {
    if (phase.value === 'correct') return 'Correct'

    const chord = current.value
    const inversion = currentInversion.value

    if (phase.value === 'revealed') {
      // Same blind spot as a wrong bass: the lamps light per pitch class, so the
      // voicing the prompt asked for has to be said rather than shown.
      if (chord && inversion) {
        const bass = noteName(inversionBass(chord, inversion), settings.value.accidentals)
        return `Lit on the keys, ${bass} at the bottom`
      }
      return 'The answer is lit on the keys'
    }

    if (phase.value !== 'wrong') return ''

    if (wrongBass.value && chord && inversion) {
      // The lamps can't show this one: they light per pitch class, so all three
      // of them are already green. Which note goes at the bottom has to be said.
      const bass = noteName(inversionBass(chord, inversion), settings.value.accidentals)
      return `Right notes — put ${bass} at the bottom`
    }

    return 'Wrong — the answer is lit on the keys'
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
    wrongBass.value = false
    startedAt = performance.now()
    armed.value = selected.value.size < 3
  }

  /**
   * Ear training: the chord itself is the prompt. Root position at the bottom
   * of the keyboard, as one chord rather than an arpeggio, so it has to be
   * heard as a shape instead of read off note by note.
   *
   * Doubles as the replay handler, and deliberately leaves the chrono running:
   * time spent listening to it a second time is time the chord took.
   */
  function playPrompt() {
    const chord = current.value
    if (!chord || settings.value.mode !== 'ear') return
    synth.playNotes(inversions(chord)[0]!.notes)
  }

  function next() {
    clearTimer()

    if (settings.value.order === 'sequential') {
      const inversion = currentInversion.value

      // With inversions on, one chord is three prompts. Walk those first.
      if (drillsInversions.value && current.value && inversion && inversion !== 'second') {
        currentInversion.value = nextInversion(inversion)
      } else {
        const list = pool.value
        if (list.length === 0) {
          current.value = null
        } else {
          // Resume from wherever the current chord sits, so switching to ordered
          // mode mid-session carries on rather than jumping back to C.
          const at = current.value ? list.findIndex(chord => sameChord(chord, current.value)) : -1
          current.value = list[(at + 1) % list.length]!
        }
        currentInversion.value = drillsInversions.value ? 'root' : null
      }
    } else {
      current.value = pickChord(pool.value, current.value)
      currentInversion.value = drillsInversions.value ? pickInversion() : null
    }

    rearm()
    playPrompt()
  }

  /**
   * Stuck: light the answer and take the miss for it, since a chord you had to
   * be shown isn't one you knew. The same prompt comes back afterwards, so it
   * still has to be played.
   */
  function reveal() {
    const chord = current.value
    if (!chord || settings.value.mode === 'explore' || phase.value !== 'awaiting') return

    const ms = performance.now() - startedAt
    // Nothing was answered, so the lamps show the answer on its own rather than
    // grading whatever was being held when the button was pressed.
    answered.value = new Set()
    wrongBass.value = false
    phase.value = 'revealed'
    stats.record(chord, ms, false, {
      inversion: currentInversion.value,
      ear: settings.value.mode === 'ear'
    })

    clearTimer()
    timer = setTimeout(retry, ANSWER_DELAY)
  }

  /** Same chord again after a miss. */
  function retry() {
    clearTimer()
    rearm()
    // In ear mode the prompt was the sound, so it has to be given again.
    playPrompt()
  }

  function evaluate() {
    const chord = current.value
    if (!chord) return

    const ms = performance.now() - startedAt
    // Graded from the MIDI notes, not the collapsed set: the inversion lives in
    // the lowest one. `matchesTriad` collapses them itself either way.
    const notes = [...selectedNotes.value]
    const inversion = currentInversion.value
    const ok = inversion
      ? matchesInversion(notes, chord, inversion)
      : matchesTriad(notes, chord)

    wrongBass.value = !ok && inversion !== null && matchesTriad(notes, chord)

    answered.value = new Set(selected.value)
    phase.value = ok ? 'correct' : 'wrong'
    stats.record(chord, ms, ok, { inversion, ear: settings.value.mode === 'ear' })

    const advance = settings.value.mode === 'ear' ? EAR_ADVANCE_DELAY : ADVANCE_DELAY

    clearTimer()
    timer = setTimeout(ok ? next : retry, ok ? advance : REVEAL_DELAY)
  }

  watch(selected, (set) => {
    // Explore is free play: no prompt, no timer, nothing to be wrong about.
    if (settings.value.mode === 'explore') return
    if (phase.value !== 'awaiting') return

    if (!armed.value) {
      if (set.size < 3) armed.value = true
      return
    }

    // Three distinct pitch classes held at once is the trigger, however they got there.
    if (set.size === 3) evaluate()
  })

  // Narrowing the pool can strand the current prompt outside it.
  watch(pool, (list) => {
    if (current.value && !list.some(chord => sameChord(chord, current.value))) next()
  })

  /**
   * Entering ear needs a chord whose name wasn't just sitting on screen, and
   * leaving it needs the inversion worked out for the mode being entered.
   * Explore has no prompt to redraw.
   */
  watch(() => settings.value.mode, (mode) => {
    if (mode !== 'explore') next()
  })

  watch(() => settings.value.inversions, () => {
    if (settings.value.mode === 'drill') next()
  })

  /** A click is a note: same sound, same effect on the answer. */
  function pressKey(midiNote: number) {
    synth.unlock()
    synth.play(midiNote)

    if (settings.value.mode !== 'explore' && phase.value !== 'awaiting') return

    const updated = new Set(clicked.value)
    if (updated.has(midiNote)) updated.delete(midiNote)
    else updated.add(midiNote)
    clicked.value = updated
  }

  function lampFor(pitchClass: PitchClass): LampState {
    if (settings.value.mode === 'explore') {
      if (!selected.value.has(pitchClass)) return 'off'
      // Amber while you build it, green once it spells one of the 24.
      return identified.value ? 'correct' : 'selected'
    }

    if (phase.value === 'awaiting') {
      return selected.value.has(pitchClass) ? 'selected' : 'off'
    }

    const wasPlayed = answered.value.has(pitchClass)
    const inTarget = target.value.has(pitchClass)

    if (wasPlayed) return inTarget ? 'correct' : 'wrong'
    if (inTarget && phase.value !== 'correct') return 'revealed'
    return 'off'
  }

  /** Explore has no prompt to advance, so it needs a way to empty the board. */
  function clearHeld() {
    clicked.value = new Set()
    midi.clearHeld()
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
    currentInversion,
    phase,
    verdict,
    selected,
    selectedNotes,
    identified,
    clearHeld,
    pool,
    lampFor,
    pressKey,
    next,
    reveal,
    replay: playPrompt,
    start
  }
}
