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

/**
 * Time a word adds to the clock.
 *
 * The table is keyed by letters, not cells, so a word containing `Qu` is paid for
 * what the player reads. The largest key floors anything longer, which is not
 * theoretical: nine cells can spell a ten-letter word.
 */
export function bonusMsFor(wordLength: number, config: GameConfig): number {
  return byWordLength(config.clock.bonusMsByLength, wordLength)
}

export interface Harvest {
  /** Honey removed from each cell, in the trail's order. */
  readonly perCell: readonly number[]
  /** Honey removed from the board in total. */
  readonly fromBoard: number
  /** Honey added to the pot, after the length multiplier. */
  readonly toPot: number
}

/**
 * How much a letter gives up per word, as a multiple of the level's harvest.
 *
 * Rare letters pay more and so empty in fewer words, which makes them self-clearing
 * rather than a dead cell the player routes around.
 * See docs/adr/0001-idle-decay-and-capacity-based-honey.md.
 */
export function rarityOf(letter: string, config: GameConfig): number {
  return config.honey.rarityHarvest[letter] ?? config.honey.rarityHarvestDefault
}

/**
 * What a word is worth, in honey off the board and in honey into the pot.
 *
 * These are two different numbers on purpose. What a cell gives up is a difficulty
 * setting — raise it and the board churns faster — and what the pot receives is a
 * scoring one. A single percentage doing both jobs meant churn could not be tuned
 * without also inflating every score.
 *
 * Rarity applies to both, so a rare letter still pays more as well as emptying
 * sooner. The length multiplier applies only to the pot, which is why the pot
 * receives more than the board loses: the multiplier rewards ambition without
 * draining the board faster, so a player chasing long words does not starve the
 * honeycomb.
 */
export function harvestFor(
  letters: readonly string[],
  wordLength: number,
  config: GameConfig,
  level: Level,
): Harvest {
  const { cellCapacity } = config.honey

  // Rarity is read once per letter and applied to both axes, so the two can never
  // drift apart on which letters they think are rare.
  const rarities = letters.map((letter) => rarityOf(letter, config))
  const totalRarity = rarities.reduce((sum, rarity) => sum + rarity, 0)

  const removed = cellCapacity * level.harvestPercent
  const perCell = rarities.map((rarity) => removed * rarity)
  const fromBoard = removed * totalRarity

  const earned = cellCapacity * level.potPercent * totalRarity
  const multiplier = byWordLength(config.scoring.lengthMultipliers, wordLength)

  return { perCell, fromBoard, toPot: earned * multiplier }
}

/** Which level a pot total puts the player in. */
export function levelIndexFor(pot: number, levels: readonly Level[]): number {
  let index = 0
  for (let i = 0; i < levels.length; i++) {
    if (pot >= levels[i]!.honeyThreshold) index = i
  }
  return index
}
