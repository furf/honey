/**
 * Test doubles for the core's ports.
 *
 * Test-only; nothing that ships imports this. The rules are tested against stubs
 * rather than the real dictionary and generator on purpose — it keeps core tests
 * fast and deterministic, and it proves the ports are honest seams rather than
 * decoration over a hard dependency.
 */

import type { Dictionary, DictionaryWalk, LetterGenerator } from './ports'
import type { BeeType, Cell, GameConfig, Level } from './types'

/**
 * A complete configuration for tests.
 *
 * Complete rather than partial: casting a half-built object to GameConfig hides the
 * moment a new field is added, and a test that silently reads undefined is worse than
 * one that fails to compile.
 */
export const testConfig: GameConfig = {
  words: { minLetters: 4, maxLetters: 9 },
  honey: { cellCapacity: 100, rarityHarvest: {}, rarityHarvestDefault: 1 },
  scoring: { lengthMultipliers: { 4: 1, 5: 1.4, 6: 2, 7: 3 } },
  health: {
    max: 100,
    restoreByLength: { 4: 8, 5: 12, 6: 16, 7: 20 },
    stingCost: 15,
    drainRampMs: 600,
  },
  generation: {
    minCommonWords: 0,
    minLongestWord: 0,
    requireEveryCellUsed: false,
    letterWeights: { Z: 1 },
    vowelFloor: 0,
    vowelCeiling: 1,
    rareLetterCaps: {},
    reseedHistoryDepth: 4,
    maxGenerationAttempts: 1,
    lengthWeights: { 4: 1 },
    familyWeight: 0,
    bigramWeight: 0,
    longWordLetters: 6,
    minLongWords: 0,
    hillClimbSteps: 0,
    reseedSharpness: 1,
  },
  board: { rings: 3, orientation: 'pointy' },
  timing: { simulationHz: 60, hudUpdateHz: 10 },
}

export function testBeeType(overrides: Partial<BeeType> = {}): BeeType {
  return {
    id: 'worker',
    sipPercent: 0.1,
    sipCapacity: 6,
    sipChance: 1,
    hopIntervalMs: 1000,
    sipDurationMs: 1000,
    arrivalMs: 1000,
    departureMs: 1000,
    intent: 'forage',
    turnMs: 0,
    ambientSound: 'bee.ambient.forager',
    approachSound: 'bee.approach.forager',
    intentFloor: 0.15,
    revisitAversion: 0.75,
    maxHops: 40,
    spriteId: 'bee.worker',
    ...overrides,
  }
}

export function testLevel(overrides: Partial<Level> = {}): Level {
  return {
    honeyThreshold: 0,
    environmentId: 'test',
    healthDrainPerSecond: 2,
    drainPauseMs: 10_000,
    harvestPercent: 0.2,
    bees: { types: [], max: 0, spawnIntervalMs: 0, waveMs: 0, calmMs: 0, speed: 1 },
    transition: { sound: 'test', durationMs: 0 },
    ...overrides,
  }
}

const noWalk: DictionaryWalk = {
  root: 0,
  step: () => {
    throw new Error('the stub dictionary has no walk; only the solver needs one')
  },
  target: () => 0,
  isWord: () => false,
  isCommon: () => false,
}

/** A dictionary backed by a plain list. Every word given is also treated as common. */
export function stubDictionary(words: readonly string[]): Dictionary {
  const all = new Set(words.map((word) => word.toUpperCase()))
  return {
    has: (word) => all.has(word.toUpperCase()),
    isCommon: (word) => all.has(word.toUpperCase()),
    hasPrefix: (prefix) => {
      const upper = prefix.toUpperCase()
      for (const word of all) if (word.startsWith(upper)) return true
      return false
    },
    walk: noWalk,
  }
}

/**
 * A generator that lays down a fixed sequence of letters.
 *
 * Board layout is then exactly known, so a test can assert on specific words rather
 * than on whatever a weighted draw happened to produce.
 */
export function stubGenerator(layout: readonly string[], reseeds: readonly string[] = ['Z']): LetterGenerator {
  let reseedIndex = 0
  return {
    id: 'stub',
    seedHoneycomb(cells: Map<string, Cell>) {
      let index = 0
      for (const cell of cells.values()) {
        cell.letter = layout[index % layout.length] ?? 'Z'
        index++
      }
    },
    reseedCell(cell: Cell) {
      const letter = reseeds[reseedIndex % reseeds.length]!
      reseedIndex++
      cell.letter = letter
      cell.history = [letter, ...cell.history].slice(0, 4)
      return letter
    },
  }
}
