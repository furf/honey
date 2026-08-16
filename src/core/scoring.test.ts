import { describe, expect, it } from 'vitest'
import { byWordLength, harvestFor, levelIndexFor } from './scoring'
import { testConfig as config, testLevel } from './testSupport'
import type { Level } from './types'

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
  it('takes a share of capacity from each cell, not of what is left', () => {
    // A share of the current level approaches zero without arriving, so cells would
    // never empty and would never reseed.
    const harvest = harvestFor(4, 4, config, level)
    expect(harvest.perCell).toBe(20)
    expect(harvest.fromBoard).toBe(80)
  })

  it('empties a cell in a fixed, countable number of words', () => {
    const { perCell } = harvestFor(1, 4, config, level)
    expect(config.honey.cellCapacity / perCell).toBe(5)
  })

  it('pays the pot more than the board loses, for longer words', () => {
    const harvest = harvestFor(6, 6, config, level)
    expect(harvest.fromBoard).toBe(120)
    expect(harvest.toPot).toBe(240)
  })

  it('pays a four-letter word at face value', () => {
    const harvest = harvestFor(4, 4, config, level)
    expect(harvest.toPot).toBe(harvest.fromBoard)
  })

  it('charges the board by cells but pays the pot by letters', () => {
    // QUIT: three cells, four letters. The board loses three cells' worth.
    const harvest = harvestFor(3, 4, config, level)
    expect(harvest.fromBoard).toBe(60)
    expect(harvest.toPot).toBe(60)
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
