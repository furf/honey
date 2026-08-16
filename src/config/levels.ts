import type { Level } from '../core/types'

/**
 * The difficulty curve, as data.
 *
 * Progression that reads as a rule is usually just a row in this table. "Bees slow
 * down on the level that introduces a second bee" is not logic — it is level 4's
 * hopIntervalMs being larger than level 3's.
 *
 * Bee disposition shifts with the levels. Early bees mostly forage and barely notice
 * the player; later ones increasingly hunt, drifting towards the cells the player has
 * drained — because an empty cell is a record of the letters they keep using.
 *
 * sipChance *falls* as levels progress. A greedy bee fills up and leaves; a reluctant
 * one lingers, and a resting bee still blocks its cell. Lowering sipChance therefore
 * costs the player routing options rather than honey, which is the greater threat.
 *
 * Level 1 has no bees at all, so a new player learns to form words before learning to
 * avoid anything.
 */
export const levels: readonly Level[] = [
  {
    honeyThreshold: 0,
    environmentId: 'sunnyDay',
    healthDrainPerSecond: 0.8,
    drainPauseMs: 12_000,
    harvestPercent: 0.2,
    bees: { types: [], min: 0, max: 0, spawnIntervalMs: 0 },
    transition: { sound: 'level.sunnyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 300,
    environmentId: 'clearNight',
    healthDrainPerSecond: 1.0,
    drainPauseMs: 11_000,
    harvestPercent: 0.2,
    bees: {
      types: ['worker'],
      min: 0,
      max: 1,
      spawnIntervalMs: 15_000,
      overrides: {
        sipChance: 0.9,
        hopIntervalMs: 1500,
        intentWeights: { forage: 9, hunt: 1, wander: 3 },
      },
    },
    transition: { sound: 'level.clearNight', durationMs: 800 },
  },
  {
    honeyThreshold: 800,
    environmentId: 'cloudyDay',
    healthDrainPerSecond: 1.3,
    drainPauseMs: 10_000,
    harvestPercent: 0.2,
    bees: {
      types: ['worker'],
      min: 0,
      max: 1,
      spawnIntervalMs: 13_000,
      overrides: {
        sipChance: 0.8,
        hopIntervalMs: 1200,
        intentWeights: { forage: 6, hunt: 2, wander: 3 },
      },
    },
    transition: { sound: 'level.cloudyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 1600,
    environmentId: 'forebodingNight',
    healthDrainPerSecond: 1.6,
    drainPauseMs: 9_500,
    harvestPercent: 0.2,
    bees: {
      types: ['worker'],
      min: 0,
      max: 2,
      spawnIntervalMs: 12_000,
      // Eased relative to level 3: a second bee arrives here, and two difficulty
      // increases should never land at once.
      overrides: {
        sipChance: 0.7,
        hopIntervalMs: 1400,
        intentWeights: { forage: 4, hunt: 4, wander: 3 },
      },
    },
    transition: { sound: 'level.forebodingNight', durationMs: 800 },
  },
  {
    honeyThreshold: 2800,
    environmentId: 'stormyDay',
    healthDrainPerSecond: 2.0,
    drainPauseMs: 9_000,
    harvestPercent: 0.2,
    bees: {
      types: ['worker'],
      min: 0,
      max: 2,
      spawnIntervalMs: 11_000,
      overrides: {
        sipChance: 0.55,
        hopIntervalMs: 1100,
        intentWeights: { forage: 2, hunt: 6, wander: 2 },
      },
    },
    transition: { sound: 'level.stormyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 4400,
    environmentId: 'stormyNight',
    healthDrainPerSecond: 2.5,
    drainPauseMs: 8_000,
    harvestPercent: 0.2,
    bees: {
      types: ['worker'],
      // The board is never bee-free at the top level.
      min: 1,
      max: 2,
      spawnIntervalMs: 10_000,
      overrides: {
        sipChance: 0.45,
        hopIntervalMs: 900,
        intentWeights: { forage: 1, hunt: 9, wander: 2 },
      },
    },
    transition: { sound: 'level.stormyNight', durationMs: 800 },
  },
]
