import type { Theme } from '../engine'
import { honeycombTheme } from './honeycomb'

/**
 * Every theme, and which one is built in.
 *
 * The active theme is a build-time constant. It is deliberately not a URL parameter
 * or a stored preference: player-facing theme selection, if it ever arrives, belongs
 * in an options screen rather than a hidden switch.
 */
export const themes: Readonly<Record<string, Theme>> = {
  honeycomb: honeycombTheme,
}

export const ACTIVE_THEME = 'honeycomb'

export function activeTheme(): Theme {
  return themes[ACTIVE_THEME]!
}
