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

    // Rare letters pay more per word and so empty in fewer words, clearing themselves
    // off the board instead of becoming a cell the player routes around. At 1.0 a cell
    // survives five words; at 2.5 it survives two.
    rarityHarvest: {
      E: 0.85, A: 0.85, I: 0.9, O: 0.9, S: 0.9, T: 0.9, R: 0.95, N: 0.95,
      L: 1.0, U: 1.05, D: 1.05, C: 1.1, M: 1.1, P: 1.15, H: 1.15, G: 1.2,
      B: 1.25, F: 1.3, Y: 1.3, W: 1.4, V: 1.6, K: 1.6, Qu: 2.0,
      X: 2.5, J: 2.5, Z: 2.5,
    },
    rarityHarvestDefault: 1,
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

    // A hand-tuned bag rather than raw English letter frequency. A board that comes
    // out as a consonant swamp is unplayable however statistically legitimate it is.
    letterWeights: {
      A: 82, B: 20, C: 34, D: 42, E: 110, F: 24, G: 26, H: 30, I: 78,
      J: 3, K: 12, L: 46, M: 28, N: 68, O: 72, P: 26, Qu: 4, R: 62,
      S: 66, T: 74, U: 34, V: 12, W: 18, X: 3, Y: 22, Z: 3,
    },

    // A band, not a floor. Measured at 52% vowels when only a floor was enforced,
    // which produced boards full of AEON, ARIA and RAIA rather than words players
    // enjoy finding.
    vowelFloor: 0.3,
    vowelCeiling: 0.4,
    rareLetterCaps: { J: 1, Qu: 1, X: 1, Z: 1, K: 2, V: 2, W: 2 },
    reseedHistoryDepth: 4,
    maxGenerationAttempts: 6,

    // Longer words must be worth disproportionately more, or the generator maximises
    // count and fills the board with four-letter words — which is what it did.
    lengthWeights: { 4: 1, 5: 3, 6: 9, 7: 20, 8: 34, 9: 50 },
    familyWeight: 6,
    stemLetters: 4,
    familyExponent: 1.5,
    bigramWeight: 40,
    longWordLetters: 6,
    minLongWords: 6,
    hillClimbSteps: 45,
    reseedSharpness: 24,
  },

  board: {
    // Two rings: 19 cells. Bigger letters, less analysis paralysis, faster games.
    // Three is still supported and is one number away.
    rings: 2,
    orientation: 'pointy',
  },

  timing: {
    simulationHz: 60,
    hudUpdateHz: 10,
  },
}
