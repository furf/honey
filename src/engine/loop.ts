/**
 * A fixed-timestep loop with an interpolated draw.
 *
 * Simulation advances in constant slices so behaviour never varies with frame rate and
 * a replay from a seed lands in the same place. Rendering runs once per frame with the
 * leftover time as an alpha, so motion stays smooth even when the two rates disagree.
 */

export interface LoopOptions {
  /** Simulation steps per second. */
  readonly hz: number
  /**
   * Largest gap the loop will try to catch up on.
   *
   * A backgrounded tab returns with a delta of minutes. Without a clamp the loop would
   * run thousands of steps in one frame and lock the page — so time is dropped instead.
   */
  readonly maxCatchUpMs: number
  step(dtMs: number): void
  render(alpha: number, frameMs: number): void
}

export interface Loop {
  start(): void
  stop(): void
  readonly running: boolean
}

export function createLoop(options: LoopOptions): Loop {
  const stepMs = 1000 / options.hz

  let raf = 0
  let previous = 0
  let accumulator = 0
  let running = false

  function frame(now: number) {
    if (!running) return

    const elapsed = Math.min(now - previous, options.maxCatchUpMs)
    previous = now
    accumulator += elapsed

    while (accumulator >= stepMs) {
      options.step(stepMs)
      accumulator -= stepMs
    }

    options.render(accumulator / stepMs, now)
    raf = requestAnimationFrame(frame)
  }

  return {
    start() {
      if (running) return
      running = true
      previous = performance.now()
      accumulator = 0
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
    get running() {
      return running
    },
  }
}
