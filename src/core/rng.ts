/**
 * Seeded pseudo-random number generation.
 *
 * Every random decision in the game draws from an injected Rng, so a whole game is
 * reproducible from its seed. This is the only practical way to reproduce a board a
 * player reports. See docs/adr/0002-layered-architecture.md.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number
  /** Uniform integer in [0, exclusiveMax). */
  int(exclusiveMax: number): number
  /** Uniform choice from a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** True with the given probability. */
  chance(probability: number): boolean
  /** Weighted choice. Weights need not sum to one. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T
}

/** mulberry32 — small, fast, and adequate for gameplay. Not for cryptography. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (exclusiveMax: number): number => Math.floor(next() * exclusiveMax)

  return {
    next,
    int,
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick from empty array')
      return items[int(items.length)]!
    },
    chance: (probability: number): boolean => next() < probability,
    weighted: <T,>(entries: readonly (readonly [T, number])[]): T => {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
      if (total <= 0) throw new Error('weighted choice needs a positive total weight')
      let roll = next() * total
      for (const [value, weight] of entries) {
        roll -= weight
        if (roll < 0) return value
      }
      return entries[entries.length - 1]![0]
    },
  }
}

/** A seed for a fresh game. The only place a non-deterministic value enters the core. */
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}
