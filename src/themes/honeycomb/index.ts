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
  music: null,
  strings: {
    title: 'Honey',
    tagline: 'Find the words. Mind the bees.',
    gameOver: 'The hive is quiet',
    copyright: '© 2026 SPARKLER*FUN',
  },
  environments,
}
