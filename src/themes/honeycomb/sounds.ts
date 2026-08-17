import type { SoundRecipe } from '../../engine'

/**
 * Sound recipes, synthesised at run time.
 *
 * Names are events, not instruments, so another theme can answer the same events with
 * a completely different palette of sounds.
 */
export const sounds: Readonly<Record<string, SoundRecipe>> = {
  // Each cell added to a trail ticks a semitone-ish higher in feel — the renderer
  // varies pitch by trail length, so this is only the base.
  'trail.step': { kind: 'tone', frequency: 440, durationMs: 70, gain: 0.12 },

  'word.scored': {
    kind: 'chord',
    frequency: 523.25,
    durationMs: 520,
    gain: 0.18,
    intervals: [0, 4, 7, 12],
  },

  // No alarm: a rejected word is the most common non-event in the game.
  'word.invalid': { kind: 'tone', frequency: 180, durationMs: 200, gain: 0.14, toFrequency: 110 },

  'word.alreadyPlayed': {
    kind: 'tone',
    frequency: 330,
    durationMs: 240,
    gain: 0.14,
    toFrequency: 300,
  },

  'cell.reseeded': { kind: 'tone', frequency: 700, durationMs: 260, gain: 0.1, toFrequency: 1100 },

  'bee.approach': { kind: 'buzz', frequency: 150, durationMs: 900, gain: 0.1 },
  'bee.sip': { kind: 'buzz', frequency: 190, durationMs: 260, gain: 0.08 },
  'bee.sting': { kind: 'noise', frequency: 900, durationMs: 380, gain: 0.3 },

  'game.over': { kind: 'chord', frequency: 220, durationMs: 900, gain: 0.2, intervals: [0, 3, 7] },
  'game.start': { kind: 'chord', frequency: 392, durationMs: 420, gain: 0.16, intervals: [0, 5, 9] },

  'level.sunnyDay': { kind: 'tone', frequency: 520, durationMs: 500, gain: 0.14, toFrequency: 780 },
  'level.clearNight': { kind: 'tone', frequency: 480, durationMs: 500, gain: 0.14, toFrequency: 700 },
  'level.cloudyDay': { kind: 'tone', frequency: 440, durationMs: 500, gain: 0.14, toFrequency: 640 },
  'level.forebodingNight': {
    kind: 'tone',
    frequency: 380,
    durationMs: 560,
    gain: 0.14,
    toFrequency: 300,
  },
  'level.stormyDay': { kind: 'tone', frequency: 340, durationMs: 560, gain: 0.14, toFrequency: 260 },
  'level.stormyNight': {
    kind: 'tone',
    frequency: 300,
    durationMs: 620,
    gain: 0.15,
    toFrequency: 200,
  },
}
