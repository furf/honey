import type { Theme } from '../../engine'
import { environments } from './environments'
import { palette, typography } from './palette'
import { logo, sprites } from './sprites'
import { sounds } from './sounds'

/**
 * The default theme: golds and ambers on sky blue, wood brown and leafy green.
 *
 * Bright, saturated and softly dimensional — the register of a casual mobile title
 * rather than a puzzle app.
 */
export const honeycombTheme: Theme = {
  id: 'honeycomb',
  palette,
  typography,
  sprites,
  logo,
  sounds,
  // Which drones sustain in each environment. The world changing is something the
  // player hears as well as sees.
  music: {
    sunnyDay: ['music.day.root', 'music.day.fifth', 'music.day.high'],
    clearNight: ['music.night.root', 'music.night.minor'],
    cloudyDay: ['music.dusk.root', 'music.dusk.third'],
    forebodingNight: ['music.night.root', 'music.night.minor', 'music.storm.tritone'],
    stormyDay: ['music.storm.root', 'music.dusk.third'],
    stormyNight: ['music.storm.root', 'music.storm.tritone'],
  },
  strings: {
    title: 'Honey',
    tagline: 'Find the words. Mind the bees.',
    gameOver: 'The hive is quiet',
    copyright: '© 2026 SPARKLER*FUN',
  },
  environments,
}
