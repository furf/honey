import type { GameConfig } from '../core/types'

/**
 * Global tunables — constants that hold regardless of level.
 *
 * Concepts are documented in docs/config-reference.md. Numbers here are expected to
 * change with playtesting; the documentation should not need to change with them.
 */
export const gameConfig: GameConfig = {
  words: {
    minLetters: 4,
    maxLetters: 9,
  },

  honey: {
    cellCapacity: 100,
  },

  scoring: {
    // Keyed by word length; the largest key acts as a floor for anything longer.
    lengthMultipliers: { 4: 1.0, 5: 1.4, 6: 2.0, 7: 3.0 },
  },

  health: {
    max: 100,
    restoreByLength: { 4: 8, 5: 12, 6: 16, 7: 20 },
    stingCost: 15,
    drainRampMs: 600,
  },

  generation: {
    minCommonWords: 40,
    minLongestWord: 6,
    requireEveryCellUsed: true,

    // A hand-tuned bag rather than raw English frequency: a 37-cell board that is a
    // consonant swamp is unplayable however statistically legitimate it is.
    letterWeights: {
      A: 82, B: 20, C: 34, D: 42, E: 110, F: 24, G: 26, H: 30, I: 78,
      J: 3, K: 12, L: 46, M: 28, N: 68, O: 72, P: 26, Qu: 4, R: 62,
      S: 66, T: 74, U: 34, V: 12, W: 18, X: 3, Y: 22, Z: 3,
    },

    vowelFloor: 0.3,
    rareLetterCaps: { J: 1, Qu: 1, X: 1, Z: 1, K: 2, V: 2, W: 2 },
    reseedHistoryDepth: 4,
    maxGenerationAttempts: 200,
  },

  board: {
    rings: 3,
    orientation: 'pointy',
  },

  timing: {
    simulationHz: 60,
    hudUpdateHz: 10,
  },
}

/** Letters that count as vowels for the generator's vowel floor. `Qu` ends in one. */
export const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Qu'])
