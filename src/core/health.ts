import type { GameConfig, Level } from './types'
import { byWordLength } from './scoring'

/**
 * Health: a constant drain, suspended by scoring.
 *
 * The rate is constant within a level rather than accelerating with idleness. A
 * player cannot reason about a rate they cannot see changing, and a constant rate is
 * the convention other games have already taught them.
 * See docs/adr/0001-idle-decay-and-capacity-based-honey.md.
 */

export interface DrainState {
  /** Milliseconds remaining before the drain resumes. */
  readonly pauseRemainingMs: number
  /** Milliseconds elapsed into the ease-in, capped at drainRampMs. */
  readonly rampElapsedMs: number
}

export interface DrainResult extends DrainState {
  /** Health lost over this step. */
  readonly drained: number
}

/**
 * Advance the drain by one step.
 *
 * When the pause expires the rate eases in from zero rather than snapping to full, so
 * the health bar does not visibly jerk back into motion. The ramp is animation polish
 * and is deliberately too short to be played around, so it is integrated across the
 * step rather than sampled at one end — sampling would make the eased-in portion
 * depend on frame rate.
 */
export function advanceDrain(
  state: DrainState,
  dtMs: number,
  config: GameConfig,
  level: Level,
): DrainResult {
  let pauseRemainingMs = state.pauseRemainingMs
  let remaining = dtMs

  if (pauseRemainingMs > 0) {
    const consumed = Math.min(pauseRemainingMs, remaining)
    pauseRemainingMs -= consumed
    remaining -= consumed
    if (remaining <= 0) return { pauseRemainingMs, rampElapsedMs: 0, drained: 0 }
  }

  const rampMs = config.health.drainRampMs
  const rate = level.healthDrainPerSecond
  const rampElapsedMs = state.rampElapsedMs + remaining
  const rampLeft = Math.max(0, rampMs - state.rampElapsedMs)

  let drained: number
  if (rampLeft > 0 && remaining > rampLeft) {
    // The step straddles the moment the ramp reaches full rate. Integrating across
    // that corner in one trapezoid would make the result depend on where the step
    // boundaries happen to fall, so the two parts are integrated separately.
    const from = state.rampElapsedMs / rampMs
    drained = rate * (rampLeft / 1000) * ((from + 1) / 2)
    drained += rate * ((remaining - rampLeft) / 1000)
  } else {
    // Wholly inside the ramp, or wholly past it. Trapezoidal is exact for both,
    // because the rate is linear across the step.
    const from = rampMs > 0 ? Math.min(1, state.rampElapsedMs / rampMs) : 1
    const to = rampMs > 0 ? Math.min(1, rampElapsedMs / rampMs) : 1
    drained = rate * (remaining / 1000) * ((from + to) / 2)
  }

  return { pauseRemainingMs, rampElapsedMs, drained }
}

/** Health restored by a word, and the pause it buys. */
export function restoreFor(
  wordLength: number,
  config: GameConfig,
  level: Level,
): { readonly restored: number; readonly pauseMs: number } {
  return {
    restored: byWordLength(config.health.restoreByLength, wordLength),
    pauseMs: level.drainPauseMs,
  }
}

export function clampHealth(health: number, config: GameConfig): number {
  return Math.max(0, Math.min(config.health.max, health))
}
