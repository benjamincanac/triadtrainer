import { onScopeDispose } from 'vue'

/**
 * A note per keypress. The point isn't fidelity, it's that every drill has a
 * sound attached — the shape/timbre association is half of what's being trained.
 *
 * Triangle oscillator, fast attack, exponential decay over ~1.5s.
 */
const ATTACK = 0.008
const RELEASE = 1.5
const PEAK = 0.22
const SILENCE = 0.0001

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
      // Three notes at once would clip at full scale.
      master.gain.value = 0.6
      master.connect(context.destination)
    }

    if (context.state === 'suspended') void context.resume()
    return context
  }

  function frequency(midiNote: number): number {
    return 440 * 2 ** ((midiNote - 69) / 12)
  }

  function play(midiNote: number) {
    const ctx = ensureContext()
    if (!ctx || !master) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(frequency(midiNote), now)

    // exponentialRamp can't touch zero, hence SILENCE as the floor.
    gain.gain.setValueAtTime(SILENCE, now)
    gain.gain.exponentialRampToValueAtTime(PEAK, now + ATTACK)
    gain.gain.exponentialRampToValueAtTime(SILENCE, now + RELEASE)

    osc.connect(gain)
    gain.connect(master)

    osc.start(now)
    osc.stop(now + RELEASE + 0.05)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
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

  return { play, unlock }
}
