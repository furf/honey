import { describe, expect, it } from 'vitest'
import { advanceDrain, clampHealth, restoreFor } from './health'
import { testConfig as config, testLevel } from './testSupport'

const level = testLevel({ healthDrainPerSecond: 2, drainPauseMs: 10_000 })

/** Run the drain forward in fixed steps, returning total health lost. */
function runFor(totalMs: number, stepMs: number, from = { pauseRemainingMs: 0, rampElapsedMs: 0 }) {
  let state = from
  let drained = 0
  for (let elapsed = 0; elapsed < totalMs; elapsed += stepMs) {
    const result = advanceDrain(state, stepMs, config, level)
    drained += result.drained
    state = { pauseRemainingMs: result.pauseRemainingMs, rampElapsedMs: result.rampElapsedMs }
  }
  return { drained, state }
}

describe('advanceDrain', () => {
  it('takes nothing while the drain is paused', () => {
    const result = advanceDrain({ pauseRemainingMs: 5000, rampElapsedMs: 0 }, 16, config, level)
    expect(result.drained).toBe(0)
    expect(result.pauseRemainingMs).toBe(4984)
  })

  it('drains at the level rate once the ramp is behind it', () => {
    const { state } = runFor(2000, 16)
    const result = advanceDrain(state, 1000, config, level)
    expect(result.drained).toBeCloseTo(2, 5)
  })

  it('eases in rather than snapping to full rate', () => {
    const first = advanceDrain({ pauseRemainingMs: 0, rampElapsedMs: 0 }, 100, config, level)
    const later = advanceDrain({ pauseRemainingMs: 0, rampElapsedMs: 10_000 }, 100, config, level)
    expect(first.drained).toBeLessThan(later.drained)
  })

  it('costs the same health regardless of step size', () => {
    // The ramp is animation polish. If it were sampled at one end of the step, its
    // cost would depend on frame rate, and a slow device would be punished.
    // 3168ms divides evenly by every step size here, so all three cover exactly the
    // same span of simulated time.
    const at16 = runFor(3168, 16).drained
    const at8 = runFor(3168, 8).drained
    const at33 = runFor(3168, 33).drained

    expect(at8).toBeCloseTo(at16, 6)
    expect(at33).toBeCloseTo(at16, 6)
  })

  it('spills leftover time past the end of a pause into the drain', () => {
    // A pause ending mid-step must not swallow the whole step.
    const result = advanceDrain({ pauseRemainingMs: 5, rampElapsedMs: 10_000 }, 1005, config, level)
    expect(result.pauseRemainingMs).toBe(0)
    expect(result.drained).toBeCloseTo(2, 5)
  })

  it('resets nothing on its own — a pause is set by scoring, not by draining', () => {
    const result = advanceDrain({ pauseRemainingMs: 0, rampElapsedMs: 600 }, 16, config, level)
    expect(result.pauseRemainingMs).toBe(0)
  })

  it('drains a full bar in the time the level rate implies', () => {
    // At 2%/s a full 100 should take about 50 seconds, plus the brief ramp.
    const { drained } = runFor(50_000, 16)
    expect(drained).toBeGreaterThan(99)
    expect(drained).toBeLessThan(101)
  })
})

describe('restoreFor', () => {
  it('restores more for longer words', () => {
    expect(restoreFor(4, config, level).restored).toBe(8)
    expect(restoreFor(6, config, level).restored).toBe(16)
  })

  it('treats the longest entry as a floor', () => {
    expect(restoreFor(9, config, level).restored).toBe(20)
  })

  it('reports the pause a word buys', () => {
    expect(restoreFor(4, config, level).pauseMs).toBe(10_000)
  })
})

describe('clampHealth', () => {
  it('never exceeds the maximum', () => {
    expect(clampHealth(140, config)).toBe(100)
  })

  it('never falls below zero', () => {
    expect(clampHealth(-20, config)).toBe(0)
  })
})
