import type { ByWordLength, GameConfig, Level } from './types'

/**
 * Honey arithmetic.
 *
 * Every transfer is a percentage of a cell's capacity, never of its current level.
 * A percentage of the current level approaches zero without arriving, so cells would
 * never empty and the reseed mechanic would never fire.
 * See docs/adr/0001-idle-decay-and-capacity-based-honey.md.
 */

/**
 * Read a value keyed by word length, treating the largest key as a floor.
 *
 * The multiplier table stops at 7, so an eight-letter word takes the seven-letter
 * entry rather than falling off the end.
 */
export function byWordLength(table: ByWordLength, length: number): number {
  let best: number | undefined
  let bestKey = -Infinity

  for (const [key, value] of Object.entries(table)) {
    const at = Number(key)
    if (at <= length && at > bestKey) {
      bestKey = at
      best = value
    }
  }

  if (best !== undefined) return best

  // Shorter than every entry: fall back to the smallest, so the table has no hole.
  let lowestKey = Infinity
  let lowest = 0
  for (const [key, value] of Object.entries(table)) {
    const at = Number(key)
    if (at < lowestKey) {
      lowestKey = at
      lowest = value
    }
  }
  return lowest
}

export interface Harvest {
  /** Honey removed from each cell in the word. */
  readonly perCell: number
  /** Honey removed from the board in total. */
  readonly fromBoard: number
  /** Honey added to the pot, after the length multiplier. */
  readonly toPot: number
}

/**
 * What a word is worth.
 *
 * The pot receives more than the board loses, because longer words are multiplied.
 * That is deliberate: the multiplier rewards ambition without draining the board
 * faster, so a player chasing long words does not starve the honeycomb.
 */
export function harvestFor(
  cellCount: number,
  wordLength: number,
  config: GameConfig,
  level: Level,
): Harvest {
  const perCell = config.honey.cellCapacity * level.harvestPercent
  const fromBoard = perCell * cellCount
  const multiplier = byWordLength(config.scoring.lengthMultipliers, wordLength)

  return { perCell, fromBoard, toPot: fromBoard * multiplier }
}

/** Which level a pot total puts the player in. */
export function levelIndexFor(pot: number, levels: readonly Level[]): number {
  let index = 0
  for (let i = 0; i < levels.length; i++) {
    if (pot >= levels[i]!.honeyThreshold) index = i
  }
  return index
}
