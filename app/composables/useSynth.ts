import { onScopeDispose } from 'vue'

/**
 * A note per keypress. The point isn't fidelity, it's that every drill has a
 * sound attached — the shape/timbre association is half of what's being trained.
 *
 * Triangle through a lowpass that closes as the note decays. A bare oscillator
 * reads as a test tone; losing the top as it dies is the cheapest thing that
 * reads as a struck string instead.
 */
const ATTACK = 0.008
const RELEASE = 1.5
const PEAK = 0.22
const SILENCE = 0.0001

/** Where the filter sits at the attack and where it lands, in fundamentals. */
const BRIGHT = 7
const DARK = 1.8

/**
 * Notes of a chord land a few milliseconds apart. Started on the same sample
 * they phase-lock into one buzzing waveform, which is what a chord struck by
 * nothing physical sounds like. The offset is far too short to hear as a roll.
 */
const ROLL_MS = 12

export function useSynth() {
  let context: AudioContext | null = null
  let master: GainNode | null = null

  /**
   * Created lazily on the first gesture: browsers refuse to start an
   * AudioContext before a user interaction.
   */
  function ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!context) {
      const Ctor = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      context = new Ctor()

      master = context.createGain()
      master.gain.value = 0.6

      // Every note rings for a second and a half, so replaying a chord a few
      // times over leaves a dozen voices sounding at once. Summed raw they run
      // past full scale and clip, which arrives as crackle rather than volume.
      const limiter = context.createDynamicsCompressor()
      limiter.threshold.value = -6
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.003
      limiter.release.value = 0.25

      master.connect(limiter)
      limiter.connect(context.destination)
    }

    if (context.state === 'suspended') void context.resume()
    return context
  }

  function frequency(midiNote: number): number {
    return 440 * 2 ** ((midiNote - 69) / 12)
  }

  /** One note, struck at `at` on the context clock. */
  function voice(midiNote: number, at: number) {
    const ctx = context
    if (!ctx || !master) return

    const hz = frequency(midiNote)
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(hz, at)

    filter.type = 'lowpass'
    filter.Q.value = 0.7
    filter.frequency.setValueAtTime(hz * BRIGHT, at)
    filter.frequency.exponentialRampToValueAtTime(hz * DARK, at + RELEASE)

    // exponentialRamp can't touch zero, hence SILENCE as the floor.
    gain.gain.setValueAtTime(SILENCE, at)
    gain.gain.exponentialRampToValueAtTime(PEAK, at + ATTACK)
    gain.gain.exponentialRampToValueAtTime(SILENCE, at + RELEASE)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(master)

    osc.start(at)
    osc.stop(at + RELEASE + 0.05)
    osc.onended = () => {
      osc.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
  }

  function play(midiNote: number) {
    const ctx = ensureContext()
    if (!ctx) return
    voice(midiNote, ctx.currentTime)
  }

  /**
   * Several notes from one gesture: a chord to find by ear, or a lesson spelling
   * one out note by note. Scheduled against the audio clock rather than with
   * timers, so the spacing is exact and nothing is left pending afterwards.
   */
  function playNotes(notes: number[], spacingMs = ROLL_MS) {
    const ctx = ensureContext()
    if (!ctx) return

    // Read once, so the offsets stay exact relative to each other even if the
    // loop straddles a render quantum.
    const start = ctx.currentTime
    notes.forEach((note, index) => voice(note, start + (index * spacingMs) / 1000))
  }

  /** Call from any user gesture to get the context running before the first note. */
  function unlock() {
    ensureContext()
  }

  onScopeDispose(() => {
    void context?.close()
    context = null
    master = null
  })

  return { play, playNotes, unlock }
}
