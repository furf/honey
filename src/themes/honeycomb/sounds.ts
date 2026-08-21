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

  // Approach and ambience are pitched apart per kind, so a player can hear which bee
  // is coming and tell when both are present without looking away from the board.
  // Kept very quiet, and gentler in timbre than it was. A buzz that runs for minutes
  // has to sit under the game rather than on it; players found the earlier one
  // annoying, which was as much the sawtooth edge as the level.
  'bee.approach.forager': { kind: 'buzz', frequency: 165, durationMs: 900, gain: 0.032 },
  'bee.approach.hunter': { kind: 'buzz', frequency: 96, durationMs: 1100, gain: 0.042 },

  // Continuous while the bee is on the board. `toFrequency` is the wobble rate here:
  // the forager flutters, the hunter throbs.
  'bee.ambient.forager': { kind: 'buzz', frequency: 172, durationMs: 0, gain: 0.007, toFrequency: 16 },
  'bee.ambient.hunter': { kind: 'buzz', frequency: 88, durationMs: 0, gain: 0.010, toFrequency: 7 },
  'bee.sip': { kind: 'buzz', frequency: 190, durationMs: 260, gain: 0.024 },
  'bee.sting': { kind: 'noise', frequency: 900, durationMs: 380, gain: 0.3 },

  // A slow drone bed per environment. Low, quiet and consonant, so it sits under the
  // game rather than competing with it — and shifts as the world does.
  'music.day.root': { kind: 'tone', frequency: 98, durationMs: 0, gain: 0.03, toFrequency: 0.08 },
  'music.day.fifth': { kind: 'tone', frequency: 147, durationMs: 0, gain: 0.022, toFrequency: 0.05 },
  'music.day.high': { kind: 'tone', frequency: 294, durationMs: 0, gain: 0.012, toFrequency: 0.03 },

  'music.dusk.root': { kind: 'tone', frequency: 87, durationMs: 0, gain: 0.032, toFrequency: 0.06 },
  'music.dusk.third': { kind: 'tone', frequency: 104, durationMs: 0, gain: 0.02, toFrequency: 0.04 },

  'music.night.root': { kind: 'tone', frequency: 73, durationMs: 0, gain: 0.035, toFrequency: 0.05 },
  'music.night.minor': { kind: 'tone', frequency: 87, durationMs: 0, gain: 0.024, toFrequency: 0.03 },

  'music.storm.root': { kind: 'tone', frequency: 65, durationMs: 0, gain: 0.04, toFrequency: 0.04 },
  'music.storm.tritone': { kind: 'tone', frequency: 92, durationMs: 0, gain: 0.026, toFrequency: 0.07 },

  /*
   * The last ten seconds, and the end.
   *
   * Two beeps a second — one on the second, one between — so the pair reads as a
   * clock rather than a metronome. The on-the-second beep is the one tied to the
   * digit flip and the red pulse; the half-second beep is the one to silence first
   * if playtesting finds the bed too dense, which is why it is quieter and can be
   * turned off from configuration.
   *
   * Both are deliberately short and quiet. A tick in the last ten seconds of every
   * single game is the kind of sound that becomes hated fastest, and the bee buzz
   * has already been through that.
   */
  'clock.tick': { kind: 'tone', frequency: 1180, durationMs: 55, gain: 0.085 },
  'clock.tock': { kind: 'tone', frequency: 880, durationMs: 50, gain: 0.05 },

  /*
   * A game-show buzzer, replacing the minor chord that used to end a game.
   *
   * Sawtooth with the engine's amplitude wobble, which reads as a klaxon's rasp at
   * this pitch rather than as an insect. It is the only harsh sound in the game, and
   * it earns that by being the last one.
   */
  'game.over': { kind: 'buzz', frequency: 112, durationMs: 850, gain: 0.34, toFrequency: 94 },
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
