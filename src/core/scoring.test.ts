import { describe, expect, it } from 'vitest'
import { bonusMsFor, byWordLength, harvestFor, levelIndexFor } from './scoring'
import { testConfig as config, testLevel } from './testSupport'
import type { GameConfig, Level } from './types'

const level = testLevel({ harvestPercent: 0.2 })

describe('byWordLength', () => {
  const table = { 4: 1, 5: 1.4, 6: 2, 7: 3 }

  it('reads an exact entry', () => {
    expect(byWordLength(table, 5)).toBe(1.4)
  })

  it('treats the largest entry as a floor for anything longer', () => {
    expect(byWordLength(table, 8)).toBe(3)
    expect(byWordLength(table, 37)).toBe(3)
  })

  it('falls back to the smallest entry below the table', () => {
    expect(byWordLength(table, 2)).toBe(1)
  })
})

describe('harvestFor', () => {
  /** testConfig carries no rarity table, so every letter harvests at the base rate. */
  const plain = (count: number) => Array.from({ length: count }, () => 'E')

  it('takes a share of capacity from each cell, not of what is left', () => {
    // A share of the current level approaches zero without arriving, so cells would
    // never empty and would never reseed.
    const harvest = harvestFor(plain(4), 4, config, level)
    expect(harvest.perCell).toEqual([20, 20, 20, 20])
    expect(harvest.fromBoard).toBe(80)
  })

  it('empties a common letter in five words', () => {
    const { perCell } = harvestFor(plain(1), 4, config, level)
    expect(config.honey.cellCapacity / perCell[0]!).toBe(5)
  })

  it('pays the pot more than the board loses, for longer words', () => {
    const harvest = harvestFor(plain(6), 6, config, level)
    expect(harvest.fromBoard).toBe(120)
    expect(harvest.toPot).toBe(240)
  })

  it('pays a four-letter word at face value', () => {
    const harvest = harvestFor(plain(4), 4, config, level)
    expect(harvest.toPot).toBe(harvest.fromBoard)
  })

  it('charges the board by cells but pays the pot by letters', () => {
    // QUIT: three cells, four letters. The board loses three cells' worth.
    const harvest = harvestFor(plain(3), 4, config, level)
    expect(harvest.fromBoard).toBe(60)
    expect(harvest.toPot).toBe(60)
  })
})

describe('rarity', () => {
  const rare: GameConfig = {
    ...config,
    honey: { ...config.honey, rarityHarvest: { E: 0.8, Z: 2.5 }, rarityHarvestDefault: 1 },
  }

  it('takes more from a rare letter than a common one', () => {
    const harvest = harvestFor(['Z', 'E'], 4, rare, level)
    expect(harvest.perCell[0]).toBeGreaterThan(harvest.perCell[1]!)
  })

  it('empties a rare letter in fewer words, so it clears itself off the board', () => {
    const words = (letter: string) =>
      rare.honey.cellCapacity / harvestFor([letter], 4, rare, level).perCell[0]!

    expect(words('Z')).toBeLessThan(words('E'))
    expect(words('Z')).toBeCloseTo(2, 5)
  })

  it('pays the player more for using one', () => {
    expect(harvestFor(['Z'], 4, rare, level).toPot).toBeGreaterThan(
      harvestFor(['E'], 4, rare, level).toPot,
    )
  })

  it('falls back to the default for a letter with no entry', () => {
    expect(harvestFor(['K'], 4, rare, level).perCell[0]).toBe(20)
  })
})

describe('levelIndexFor', () => {
  const levels: Level[] = [0, 300, 800, 1600].map((honeyThreshold) =>
    testLevel({ honeyThreshold }),
  )

  it('starts at the first level', () => {
    expect(levelIndexFor(0, levels)).toBe(0)
  })

  it('stays below a threshold until it is reached', () => {
    expect(levelIndexFor(299, levels)).toBe(0)
    expect(levelIndexFor(300, levels)).toBe(1)
  })

  it('plateaus at the last level', () => {
    expect(levelIndexFor(1_000_000, levels)).toBe(3)
  })

  it('never goes backwards as the pot grows', () => {
    let previous = 0
    for (let pot = 0; pot < 2000; pot += 17) {
      const index = levelIndexFor(pot, levels)
      expect(index).toBeGreaterThanOrEqual(previous)
      previous = index
    }
  })
})

describe('bonusMsFor', () => {
  it('pays the fibonacci step for each length', () => {
    expect(bonusMsFor(4, config)).toBe(1_000)
    expect(bonusMsFor(6, config)).toBe(3_000)
    expect(bonusMsFor(9, config)).toBe(13_000)
  })

  it('widens the gap between short and long words', () => {
    // The reason the curve was shifted. Short words stay usable without being able to
    // sustain the clock, which the ratio is what enforces.
    const shortest = bonusMsFor(4, config)
    const longest = bonusMsFor(9, config)
    expect(longest / shortest).toBeGreaterThanOrEqual(13)
  })

  it('floors anything longer at the largest entry', () => {
    // Not theoretical: nine cells spell a ten-letter word when one of them is `Qu`.
    expect(bonusMsFor(10, config)).toBe(13_000)
  })

  it('falls back to the shortest entry below the table', () => {
    // Unreachable in play — a word this short is rejected before it is scored — but
    // the table must have no hole in it.
    expect(bonusMsFor(3, config)).toBe(1_000)
  })
})

describe('the two honey axes', () => {
  const letters = ['T', 'E', 'A', 'M']

  it('takes from the board at the harvest rate', () => {
    const level = testLevel({ harvestPercent: 0.4, potPercent: 0.2 })
    expect(harvestFor(letters, 4, config, level).fromBoard).toBe(160)
  })

  it('credits the pot at the pot rate, not the harvest rate', () => {
    const level = testLevel({ harvestPercent: 0.4, potPercent: 0.2 })
    expect(harvestFor(letters, 4, config, level).toPot).toBe(80)
  })

  it('churns faster without paying more', () => {
    // The whole point of the split. Doubling churn must leave the score alone,
    // because the pot is what advances the player through the levels.
    const calm = testLevel({ harvestPercent: 0.2, potPercent: 0.2 })
    const brisk = testLevel({ harvestPercent: 0.4, potPercent: 0.2 })

    expect(harvestFor(letters, 4, config, brisk).fromBoard).toBeGreaterThan(
      harvestFor(letters, 4, config, calm).fromBoard,
    )
    expect(harvestFor(letters, 4, config, brisk).toPot).toBe(
      harvestFor(letters, 4, config, calm).toPot,
    )
  })

  it('pays more without churning faster', () => {
    const lean = testLevel({ harvestPercent: 0.2, potPercent: 0.2 })
    const rich = testLevel({ harvestPercent: 0.2, potPercent: 0.4 })

    expect(harvestFor(letters, 4, config, rich).toPot).toBeGreaterThan(
      harvestFor(letters, 4, config, lean).toPot,
    )
    expect(harvestFor(letters, 4, config, rich).fromBoard).toBe(
      harvestFor(letters, 4, config, lean).fromBoard,
    )
  })
})
