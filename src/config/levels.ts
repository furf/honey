import type { Level } from '../core/types'

/**
 * The difficulty curve, as data.
 *
 * Ten levels rather than six. Testers reported levels passing too quickly — measured
 * against the old thresholds the first two flipped past in three and five words, before
 * anything had happened. Each level here is paced at roughly eight to twelve words, so
 * a bee has room to arrive, do something and leave before the world changes again.
 *
 * The clock is global and untouched by levels: it is the same countdown from the
 * first word to the last. What a level changes is how fast the board gives up its
 * honey, and what the bees are doing.
 *
 * Bees arrive in waves with calm between them. Constant presence removes the suspense:
 * a threat that is always there stops being a threat. Waves lengthen and calms shorten
 * as levels progress, so pressure builds rather than being switched on.
 *
 * Disposition shifts by which kinds a level fields. The first bee a player ever meets
 * is a forager, which mostly ignores them; hunters arrive once bees are understood.
 * Level 1 has no bees at all, so words come first.
 *
 * `speed` scales every bee timing, so bees quicken across the curve without restating
 * each interval.
 */
export const levels: readonly Level[] = [
  {
    honeyThreshold: 0,
    environmentId: 'sunnyDay',
    harvestPercent: 0.2,
    bees: {
      types: [],
      max: 0,
      spawnIntervalMs: 0,
      waveMs: 0,
      calmMs: 0,
      speed: 1.0,
    },
    transition: { sound: 'level.sunnyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 900,
    environmentId: 'sunnyDay',
    harvestPercent: 0.2,
    bees: {
      types: ['forager'],
      max: 1,
      spawnIntervalMs: 6000,
      waveMs: 12000,
      calmMs: 16000,
      speed: 1.0,
    },
    transition: { sound: 'level.sunnyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 2000,
    environmentId: 'clearNight',
    harvestPercent: 0.2,
    bees: {
      types: ['forager'],
      max: 1,
      spawnIntervalMs: 6000,
      waveMs: 16000,
      calmMs: 14000,
      speed: 1.05,
    },
    transition: { sound: 'level.clearNight', durationMs: 800 },
  },
  {
    honeyThreshold: 3400,
    environmentId: 'clearNight',
    harvestPercent: 0.2,
    bees: {
      types: ['forager', 'hunter'],
      max: 1,
      spawnIntervalMs: 6000,
      waveMs: 18000,
      calmMs: 13000,
      speed: 1.1,
    },
    transition: { sound: 'level.clearNight', durationMs: 800 },
  },
  {
    honeyThreshold: 5100,
    environmentId: 'cloudyDay',
    harvestPercent: 0.2,
    bees: {
      types: ['forager', 'hunter'],
      max: 1,
      spawnIntervalMs: 5500,
      waveMs: 22000,
      calmMs: 12000,
      speed: 1.15,
    },
    transition: { sound: 'level.cloudyDay', durationMs: 800 },
  },
  {
    // The level that introduces a second bee. Churn holds at the previous rate and
    // bees slow down, so a player meets one new thing at a time rather than three.
    // The curve is data: this is a lower `speed` in one row, not a rule in code.
    honeyThreshold: 7100,
    environmentId: 'cloudyDay',
    harvestPercent: 0.2,
    bees: {
      types: ['forager', 'hunter'],
      max: 2,
      spawnIntervalMs: 5500,
      waveMs: 24000,
      calmMs: 11000,
      speed: 1.05,
    },
    transition: { sound: 'level.cloudyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 9400,
    environmentId: 'forebodingNight',
    harvestPercent: 0.2,
    bees: {
      types: ['forager', 'hunter'],
      max: 2,
      spawnIntervalMs: 5000,
      waveMs: 28000,
      calmMs: 10000,
      speed: 1.3,
    },
    transition: { sound: 'level.forebodingNight', durationMs: 800 },
  },
  {
    honeyThreshold: 12000,
    environmentId: 'stormyDay',
    harvestPercent: 0.2,
    bees: {
      types: ['forager', 'hunter'],
      max: 2,
      spawnIntervalMs: 5000,
      waveMs: 32000,
      calmMs: 9000,
      speed: 1.4,
    },
    transition: { sound: 'level.stormyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 15000,
    environmentId: 'stormyDay',
    harvestPercent: 0.2,
    bees: {
      types: ['forager', 'hunter'],
      max: 2,
      spawnIntervalMs: 4500,
      waveMs: 38000,
      calmMs: 8000,
      speed: 1.5,
    },
    transition: { sound: 'level.stormyDay', durationMs: 800 },
  },
  {
    honeyThreshold: 18500,
    environmentId: 'stormyNight',
    harvestPercent: 0.2,
    bees: {
      types: ['forager', 'hunter'],
      max: 2,
      spawnIntervalMs: 4000,
      waveMs: 45000,
      calmMs: 7000,
      speed: 1.6,
    },
    transition: { sound: 'level.stormyNight', durationMs: 800 },
  },
]
