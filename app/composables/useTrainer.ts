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
  matchesStaffNote,
  matchesTriad,
  nextInversion,
  noteName,
  pickChord,
  pickInversion,
  pickStaffLine,
  sameChord,
  sameStaffNote,
  scale,
  scaleRun,
  scaleStep,
  staffNoteMidi,
  staffNoteName,
  staffNotePool,
  staffRun,
  toPitchClass,
  type Chord,
  type InversionName,
  type PitchClass,
  type StaffNote
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
    // Fires on fresh note-ons only (useMidi drops repeats of a held note),
    // which is exactly the granularity the scale run is graded at.
    onNoteInput(note)
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
   * A scale run has no inversions to ask for either.
   */
  const drillsInversions = computed(() =>
    settings.value.inversions && settings.value.mode === 'drill' && settings.value.exercise === 'triads'
  )

  /** Scales exist in drill mode only; ear and explore stay triads. */
  const drillsScales = computed(() =>
    settings.value.mode === 'drill' && settings.value.exercise === 'scales'
  )

  /** The next step of the run being played, 0-14. */
  const scaleIndex = ref(0)

  /** Reading is a drill exercise too; ear and explore have no staff. */
  const drillsNotes = computed(() =>
    settings.value.mode === 'drill' && settings.value.exercise === 'notes'
  )

  /**
   * The written notes being asked for, read left to right. One of them is a
   * flashcard, several are a line. Kept apart from `current`, it isn't a chord.
   */
  const currentLine = ref<StaffNote[]>([])

  /** The note of the line that is due next. Stays on the last one once it's played. */
  const noteIndex = ref(0)

  const notePool = computed(() => staffNotePool(settings.value.clef, settings.value.alterations))

  /**
   * What an attempt is filed under, and for a line the note that is due: the
   * one a miss or a reveal has to light. A note has no quality, but the row
   * needs one to stay readable, and `ex` keeps it off the triad grid either way.
   */
  const subject = computed<Chord | null>(() => {
    if (!drillsNotes.value) return current.value
    const note = currentLine.value[noteIndex.value]
    return note ? { root: toPitchClass(staffNoteMidi(note)), quality: 'major' } : null
  })

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

  const target = computed(() => {
    if (drillsNotes.value) return new Set<PitchClass>(subject.value ? [subject.value.root] : [])
    if (!current.value) return new Set<PitchClass>()
    // A scale reveal lights all seven degrees; order is the prompt's job.
    if (drillsScales.value) return new Set(scale(current.value.root, current.value.quality))
    return new Set(chordPitchClasses(current.value))
  })

  const verdict = computed(() => {
    if (phase.value === 'correct') return 'Correct'

    // The lamps light the scale as a set; where the run broke is on the dots.
    if (drillsScales.value) {
      if (phase.value === 'revealed') return 'The scale is lit on the keys'
      return phase.value === 'wrong' ? 'Wrong — the scale is lit on the keys' : ''
    }

    // A miss retries the same note with its key already lit, so naming it too
    // gives nothing away that the lamp hasn't.
    if (drillsNotes.value) {
      const due = currentLine.value[noteIndex.value]
      if (!due || phase.value === 'awaiting') return ''
      // Named as written: a Bb on the staff isn't an A#, whatever the key caps say.
      const name = staffNoteName(due, settings.value.naming)
      return phase.value === 'wrong' ? `Wrong — ${name} is lit on the keys` : `${name} is lit on the keys`
    }

    const chord = current.value
    const inversion = currentInversion.value

    if (phase.value === 'revealed') {
      // Same blind spot as a wrong bass: the lamps light per pitch class, so the
      // voicing the prompt asked for has to be said rather than shown.
      if (chord && inversion) {
        const bass = noteName(inversionBass(chord, inversion), settings.value.accidentals, settings.value.naming)
        return `Lit on the keys, ${bass} at the bottom`
      }
      return 'The answer is lit on the keys'
    }

    if (phase.value !== 'wrong') return ''

    if (wrongBass.value && chord && inversion) {
      // The lamps can't show this one: they light per pitch class, so all three
      // of them are already green. Which note goes at the bottom has to be said.
      const bass = noteName(inversionBass(chord, inversion), settings.value.accidentals, settings.value.naming)
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
    scaleIndex.value = 0
    noteIndex.value = 0
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

    // The chord prompt is left where it was, so coming back to it resumes.
    if (drillsNotes.value) {
      const list = notePool.value
      const length = settings.value.lineLength
      if (settings.value.order === 'sequential') {
        // Carry on from the last note written, so the walk covers the staff.
        const last = currentLine.value.at(-1) ?? null
        const at = list.findIndex(note => sameStaffNote(note, last))
        currentLine.value = staffRun(list, at + 1, length)
      } else {
        currentLine.value = pickStaffLine(list, length, currentLine.value)
      }
      // Left over from the triads otherwise, and a reveal would file it on a note.
      currentInversion.value = null
      rearm()
      return
    }

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
    const chord = subject.value
    if (!chord || settings.value.mode === 'explore' || phase.value !== 'awaiting') return

    const ms = performance.now() - startedAt
    // Nothing was answered, so the lamps show the answer on its own rather than
    // grading whatever was being held when the button was pressed.
    answered.value = new Set()
    wrongBass.value = false
    phase.value = 'revealed'
    stats.record(chord, ms, false, {
      inversion: currentInversion.value,
      ear: settings.value.mode === 'ear',
      scale: drillsScales.value,
      note: drillsNotes.value
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

  /**
   * The reading drill's validator. Like the scale run it grades one note-on at
   * a time: the right one moves along the line, and only the last one or a
   * wrong one ends the attempt.
   */
  function gradeNote(midiNote: number) {
    const line = currentLine.value
    const note = line[noteIndex.value]
    const filed = subject.value
    if (!note || !filed || phase.value !== 'awaiting') return

    const ok = matchesStaffNote(midiNote, note)
    if (ok && noteIndex.value < line.length - 1) {
      noteIndex.value++
      return
    }

    const ms = performance.now() - startedAt
    answered.value = new Set([toPitchClass(midiNote)])
    phase.value = ok ? 'correct' : 'wrong'
    stats.record(filed, ms, ok, { note: true })

    clearTimer()
    timer = setTimeout(ok ? next : retry, ok ? ADVANCE_DELAY : REVEAL_DELAY)
  }

  /**
   * The scale drill's validator. Where the triad drill grades a set held at
   * once, this grades one note-on at a time against the run, so it hangs off
   * the note events themselves rather than the held-set watcher.
   */
  function onNoteInput(midiNote: number) {
    if (drillsNotes.value) {
      gradeNote(midiNote)
      return
    }

    const chord = current.value
    if (!chord || !drillsScales.value || phase.value !== 'awaiting') return

    const graded = scaleStep(scaleRun(chord.root, chord.quality), scaleIndex.value, midiNote)

    if (graded === 'advance') {
      scaleIndex.value++
      return
    }

    const ms = performance.now() - startedAt
    const ok = graded === 'complete'
    // On a miss the lamps single out the offending key against the lit scale;
    // on completion the set and the answer are the same seven notes.
    answered.value = ok ? new Set(scale(chord.root, chord.quality)) : new Set([toPitchClass(midiNote)])
    phase.value = ok ? 'correct' : 'wrong'
    stats.record(chord, ms, ok, { scale: true })

    clearTimer()
    timer = setTimeout(ok ? next : retry, ok ? ADVANCE_DELAY : REVEAL_DELAY)
  }

  watch(selected, (set) => {
    // Explore is free play: no prompt, no timer, nothing to be wrong about.
    if (settings.value.mode === 'explore') return
    // Scales grade note by note in onNoteInput; three held notes mean nothing.
    if (drillsScales.value || drillsNotes.value) return
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
    // Not while reading: `next` would redraw the note, and the chord gets
    // redrawn on the way back to it anyway.
    if (drillsNotes.value) return
    if (current.value && !list.some(chord => sameChord(chord, current.value))) next()
  })

  // Same for the staves: dropping a clef can strand the note written on it.
  watch(notePool, (list) => {
    if (!drillsNotes.value) return
    if (!currentLine.value.every(written => list.some(note => sameStaffNote(note, written)))) next()
  })

  watch(() => settings.value.lineLength, () => {
    if (drillsNotes.value) next()
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

  watch(() => settings.value.exercise, () => {
    if (settings.value.mode === 'drill') next()
  })

  /** A click is a note: same sound, same effect on the answer. */
  function pressKey(midiNote: number) {
    synth.unlock()
    synth.play(midiNote)

    if (settings.value.mode !== 'explore' && phase.value !== 'awaiting') return

    // A scale click is one transient step, not part of a chord being built, so
    // it skips the latch below — latching would toggle a re-pressed key off.
    // A read note is a single click for the same reason.
    if (drillsScales.value || drillsNotes.value) {
      onNoteInput(midiNote)
      return
    }

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

    // A broken run singles out the note that broke it, even when it belongs to
    // the scale: the miss was the order, and green would say otherwise.
    if (drillsScales.value && phase.value === 'wrong') return wasPlayed ? 'wrong' : inTarget ? 'revealed' : 'off'

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
    currentLine,
    noteIndex,
    currentInversion,
    phase,
    verdict,
    scaleIndex,
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
