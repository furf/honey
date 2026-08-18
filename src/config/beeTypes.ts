import type { BeeType } from '../core/types'

/**
 * The two kinds of bee.
 *
 * They are separate types rather than two moods of one, so each carries its own
 * sprite and its own buzz: which bee is on the board should be legible at a glance
 * and audible without looking. A level fields at most one of each, so two bees are
 * always one of each rather than a pair of the same.
 *
 * See docs/adr/0005-bee-behaviour-lives-on-bee-types.md.
 */

const shared = {
  sipCapacity: 6,
  sipDurationMs: 1200,
  arrivalMs: 1400,
  departureMs: 900,
  intentFloor: 0.15,
  revisitAversion: 0.75,
  turnMs: 260,
} as const

export const beeTypes: Readonly<Record<string, BeeType>> = {
  /** Goes where the honey is. Largely indifferent to the player. */
  forager: {
    ...shared,
    id: 'forager',
    intent: 'forage',
    sipPercent: 0.1,
    sipChance: 0.9,
    hopIntervalMs: 1500,
    maxHops: 24,
    spriteId: 'bee.forager',
    ambientSound: 'bee.ambient.forager',
    approachSound: 'bee.approach.forager',
  },

  /**
   * Goes where the honey is not — which is where the player has been.
   *
   * Sips less and lingers longer, so it costs routing options rather than honey.
   */
  hunter: {
    ...shared,
    id: 'hunter',
    intent: 'hunt',
    sipPercent: 0.08,
    sipChance: 0.45,
    hopIntervalMs: 1300,
    maxHops: 30,
    spriteId: 'bee.hunter',
    ambientSound: 'bee.ambient.hunter',
    approachSound: 'bee.approach.hunter',
  },
}

export const DEFAULT_BEE_TYPE = 'forager'
