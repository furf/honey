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
  /**
   * Set which continuous sounds should be playing, by name.
   *
   * Declarative rather than start/stop, so the caller can hand over the current state
   * of the world each frame without tracking what it started. Sounds already playing
   * are left running, so a buzz does not restart every frame and stutter.
   */
  setAmbient(names: readonly string[]): void
  /**
   * Stop or restart everything as the page goes away and comes back.
   *
   * Locking a phone or switching apps stops the render loop but not the audio graph,
   * so a sustained buzz keeps playing out of a pocket. Suspending the context is the
   * only thing that actually silences it.
   */
  setSuspended(suspended: boolean): void
  setMuted(muted: boolean): void
  readonly muted: boolean
  dispose(): void
}

interface Ambient {
  readonly gain: GainNode
  readonly stop: () => void
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

  const ambient = new Map<string, Ambient>()

  /** A sound that runs until told otherwise, for as long as a bee is on the board. */
  function startAmbient(recipe: SoundRecipe): Ambient | null {
    const ctx = ensure()
    if (!ctx || !master) return null

    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    // Fade in: a buzz that appears at full volume sounds like a click.
    gain.gain.linearRampToValueAtTime(recipe.gain, now + 0.25)
    gain.connect(master)

    const oscillator = ctx.createOscillator()
    // Triangle, not sawtooth. A sawtooth is right for a short stab but grating over
    // minutes, and the ambient buzz runs the whole time a bee is on the board —
    // players described it as annoying, which is a timbre problem before it is a
    // volume one. A triangle still reads as an insect once it wobbles.
    oscillator.type = recipe.kind === 'buzz' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(recipe.frequency, now)

    // Roll the top off as well, so nothing sharp is left to fatigue the ear.
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = recipe.kind === 'buzz' ? recipe.frequency * 4 : 2000
    tone.Q.value = 0.5

    // For a sustained sound, `toFrequency` is a wobble rate rather than a target
    // pitch: it is what makes the tone read as an insect instead of a synthesiser,
    // and at a fraction of a hertz it gives a music drone its slow drift. The two
    // kinds of bee wobble at different rates, so a player can hear which is present
    // without looking.
    const wobble = ctx.createOscillator()
    const wobbleGain = ctx.createGain()
    wobble.frequency.value = recipe.toFrequency ?? 18
    wobbleGain.gain.value = recipe.frequency * (recipe.kind === 'buzz' ? 0.07 : 0.012)
    wobble.connect(wobbleGain).connect(oscillator.frequency)

    oscillator.connect(tone).connect(gain)
    oscillator.start(now)
    wobble.start(now)

    return {
      gain,
      stop: () => {
        const at = ctx.currentTime
        gain.gain.cancelScheduledValues(at)
        gain.gain.setValueAtTime(gain.gain.value, at)
        gain.gain.linearRampToValueAtTime(0, at + 0.3)
        oscillator.stop(at + 0.35)
        wobble.stop(at + 0.35)
      },
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
    setAmbient(names: readonly string[]) {
      const wanted = new Set(names)

      for (const [name, running] of ambient) {
        if (wanted.has(name)) continue
        running.stop()
        ambient.delete(name)
      }

      for (const name of wanted) {
        if (ambient.has(name)) continue
        const recipe = recipes[name]
        if (!recipe) continue
        const started = startAmbient(recipe)
        if (started) ambient.set(name, started)
      }
    },

    setSuspended(suspended: boolean) {
      const ctx = context
      if (!ctx) return
      if (suspended) {
        if (ctx.state === 'running') void ctx.suspend()
      } else if (ctx.state === 'suspended') {
        void ctx.resume()
      }
    },

    setMuted(next: boolean) {
      muted = next
      if (master) master.gain.value = next ? 0 : 1
    },
    get muted() {
      return muted
    },
    dispose() {
      for (const running of ambient.values()) running.stop()
      ambient.clear()
      void context?.close()
      context = null
      master = null
    },
  }
}
