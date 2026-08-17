import type { SoundRecipe } from './theme'

/**
 * Sound, synthesised rather than sampled.
 *
 * Every effect is built from oscillators and noise at run time, so the MVP ships no
 * audio assets and carries no licensing questions. Recipes live in the theme, so a
 * different theme can sound completely different without touching this file — and
 * real recordings can replace synthesis later behind the same interface.
 */

export interface SoundBank {
  /** Resume the audio context. Must be called from a user gesture on mobile. */
  unlock(): Promise<void>
  play(name: string): void
  setMuted(muted: boolean): void
  readonly muted: boolean
  dispose(): void
}

export function createSoundBank(recipes: Readonly<Record<string, SoundRecipe>>): SoundBank {
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let muted = false

  function ensure(): AudioContext | null {
    if (context) return context
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null

    context = new Ctor()
    master = context.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(context.destination)
    return context
  }

  function noiseBuffer(ctx: AudioContext, durationMs: number): AudioBuffer {
    const frames = Math.max(1, Math.floor((ctx.sampleRate * durationMs) / 1000))
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frames; index++) data[index] = Math.random() * 2 - 1
    return buffer
  }

  function playRecipe(recipe: SoundRecipe): void {
    const ctx = ensure()
    if (!ctx || !master || muted) return

    const now = ctx.currentTime
    const seconds = recipe.durationMs / 1000

    const envelope = ctx.createGain()
    envelope.connect(master)
    // A short attack avoids the click a square-edged envelope produces.
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(recipe.gain, now + Math.min(0.02, seconds / 4))
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + seconds)

    if (recipe.kind === 'noise') {
      const source = ctx.createBufferSource()
      source.buffer = noiseBuffer(ctx, recipe.durationMs)

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = recipe.frequency

      source.connect(filter).connect(envelope)
      source.start(now)
      source.stop(now + seconds)
      return
    }

    const intervals = recipe.kind === 'chord' ? (recipe.intervals ?? [0, 4, 7]) : [0]

    for (const semitones of intervals) {
      const oscillator = ctx.createOscillator()
      const frequency = recipe.frequency * Math.pow(2, semitones / 12)

      oscillator.type = recipe.kind === 'buzz' ? 'sawtooth' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, now)

      if (recipe.toFrequency !== undefined) {
        const target = recipe.toFrequency * Math.pow(2, semitones / 12)
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, target), now + seconds)
      }

      if (recipe.kind === 'buzz') {
        // Amplitude wobble is what makes a sawtooth read as an insect rather than a
        // synthesiser. Frequency alone sounds like a doorbell.
        const wobble = ctx.createOscillator()
        const wobbleGain = ctx.createGain()
        wobble.frequency.value = 18
        wobbleGain.gain.value = frequency * 0.06
        wobble.connect(wobbleGain).connect(oscillator.frequency)
        wobble.start(now)
        wobble.stop(now + seconds)
      }

      oscillator.connect(envelope)
      oscillator.start(now)
      oscillator.stop(now + seconds)
    }
  }

  return {
    async unlock() {
      const ctx = ensure()
      if (ctx && ctx.state === 'suspended') await ctx.resume()
    },
    play(name: string) {
      const recipe = recipes[name]
      if (recipe) playRecipe(recipe)
    },
    setMuted(next: boolean) {
      muted = next
      if (master) master.gain.value = next ? 0 : 1
    },
    get muted() {
      return muted
    },
    dispose() {
      void context?.close()
      context = null
      master = null
    },
  }
}
