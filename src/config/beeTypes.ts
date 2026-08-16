import type { BeeType } from '../core/types'

/**
 * Kinds of bee.
 *
 * The MVP ships one, referenced by every level, so the indirection exists but carries
 * no variety yet. A greedier, slower type is a new entry here and a reference from a
 * level — not a code change.
 *
 * See docs/adr/0005-bee-behaviour-lives-on-bee-types.md.
 */
export const beeTypes: Readonly<Record<string, BeeType>> = {
  worker: {
    id: 'worker',
    sipPercent: 0.1,
    // Counted in sips, not honey units, so a bee's visit is a fixed number of stops
    // regardless of appetite and the fill animation maps to a clean 1/6 per sip.
    sipCapacity: 6,
    sipChance: 0.9,
    hopIntervalMs: 1500,
    sipDurationMs: 1200,
    // The approach is visible and audible before the bee can sting, so a sting is
    // always a mistake rather than an ambush.
    arrivalMs: 1200,
    departureMs: 900,
    // Baseline disposition. Levels shift these, so bees grow more interested in the
    // player as the game goes on rather than behaving identically throughout.
    intentWeights: { forage: 6, hunt: 1, wander: 3 },
    intentShiftChance: 0.2,
    intentFloor: 0.15,
    revisitAversion: 0.75,
    maxHops: 24,
    spriteId: 'bee.worker',
  },
}

export const DEFAULT_BEE_TYPE = 'worker'
