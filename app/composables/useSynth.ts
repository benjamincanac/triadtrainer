import { onScopeDispose } from 'vue'

/**
 * A note per keypress. The point isn't fidelity, it's that every drill has a
 * sound attached — the shape/timbre association is half of what's being trained.
 *
 * A recorded piano once the samples are in, a filtered triangle until they are
 * and if they never arrive. The oscillator is the floor, not history: the drill
 * has to make a sound on the first keypress, offline included.
 */

/**
 * Salamander is sampled in minor thirds. These fourteen cover C3 to D#6, which
 * is the keyboard plus enough headroom either side to pitch into.
 */
const SAMPLE_PATH = '/piano'
const SAMPLES: Record<number, string> = {
  48: 'C3',
  51: 'Ds3',
  54: 'Fs3',
  57: 'A3',
  60: 'C4',
  63: 'Ds4',
  66: 'Fs4',
  69: 'A4',
  72: 'C5',
  75: 'Ds5',
  78: 'Fs5',
  81: 'A5',
  84: 'C6',
  87: 'Ds6'
}
const SAMPLE_NOTES = Object.keys(SAMPLES).map(Number)

/**
 * The files are cut to three seconds and only the first two and a bit are ever
 * heard: held at full for a beat, then faded, so a fast run doesn't leave a
 * dozen tails sounding over each other.
 */
const SAMPLE_PEAK = 0.4
const HOLD = 1.2
const FADE = 1.1

/** The fallback voice: triangle through a lowpass that closes as it decays. */
const ATTACK = 0.008
const RELEASE = 1.5
const PEAK = 0.22
const SILENCE = 0.0001
const BRIGHT = 7
const DARK = 1.8

/**
 * Notes of a chord land a few milliseconds apart. Started on the same sample
 * they phase-lock into one waveform, which is what a chord struck by nothing
 * physical sounds like. The offset is far too short to hear as a roll.
 */
const ROLL_MS = 12

/**
 * Decoded once for the whole app. An AudioBuffer isn't tied to the context that
 * decoded it, so this survives the trainer and the lessons each building their
 * own, and outlives either of them being torn down.
 */
let samples: Map<number, AudioBuffer> | null = null
let loading: Promise<void> | null = null

/**
 * Decoding needs a context, but not a running one, and an offline context needs
 * no user gesture. That's what lets the piano be ready for the first keypress
 * rather than the second.
 */
function decoder(): BaseAudioContext | null {
  const Ctor = window.OfflineAudioContext
    || (window as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  return Ctor ? new Ctor(1, 1, 44100) : null
}

function loadSamples(): Promise<void> {
  if (loading) return loading
  // Never on the server, where this module's state is shared between requests.
  if (typeof window === 'undefined') return Promise.resolve()

  loading = (async () => {
    const ctx = decoder()
    if (!ctx) return

    const decoded = new Map<number, AudioBuffer>()

    await Promise.all(Object.entries(SAMPLES).map(async ([note, name]) => {
      try {
        const response = await fetch(`${SAMPLE_PATH}/${name}.mp3`)
        if (!response.ok) return
        decoded.set(Number(note), await ctx.decodeAudioData(await response.arrayBuffer()))
      } catch {
        // Offline, blocked, or unplayable. The oscillator covers the gap.
      }
    }))

    if (decoded.size > 0) samples = decoded
  })()

  return loading
}

/** The sampled note nearest this one, never more than a minor third away. */
function nearest(midiNote: number): number {
  return SAMPLE_NOTES.reduce((best, note) =>
    (Math.abs(note - midiNote) < Math.abs(best - midiNote) ? note : best)
  )
}

export function useSynth() {
  let context: AudioContext | null = null
  let master: GainNode | null = null

  void loadSamples()

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

      // Every note rings for a second or more, so replaying a chord a few times
      // over leaves a dozen voices sounding at once. Summed raw they run past
      // full scale and clip, which arrives as crackle rather than volume.
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

  /** A recorded note, pitched off the nearest sample. False when none is ready. */
  function sampled(midiNote: number, at: number): boolean {
    const ctx = context
    if (!ctx || !master || !samples) return false

    const source = nearest(midiNote)
    const buffer = samples.get(source)
    if (!buffer) return false

    const node = ctx.createBufferSource()
    const gain = ctx.createGain()

    node.buffer = buffer
    // A semitone at the outside, since the samples sit a minor third apart. Six
    // percent of speed is a note, not a tape running fast.
    node.playbackRate.value = 2 ** ((midiNote - source) / 12)

    gain.gain.setValueAtTime(SAMPLE_PEAK, at)
    gain.gain.setValueAtTime(SAMPLE_PEAK, at + HOLD)
    gain.gain.exponentialRampToValueAtTime(SILENCE, at + HOLD + FADE)

    node.connect(gain)
    gain.connect(master)

    node.start(at)
    node.stop(at + HOLD + FADE)
    node.onended = () => {
      node.disconnect()
      gain.disconnect()
    }

    return true
  }

  /** The synthesised voice, for before the samples land and for when they don't. */
  function synthesized(midiNote: number, at: number) {
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

  /** One note, struck at `at` on the context clock. */
  function voice(midiNote: number, at: number) {
    if (!sampled(midiNote, at)) synthesized(midiNote, at)
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
