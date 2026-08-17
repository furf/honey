/**
 * The little that survives a reload.
 *
 * Storage is strictly optional: private browsing and locked-down settings both throw
 * on access, and the game must play identically when it does. Everything here
 * degrades to in-memory rather than failing.
 */

const KEY = 'honey.settings.v1'

export interface Settings {
  muted: boolean
  highScore: number
}

const defaults: Settings = { muted: false, highScore: 0 }

let cache: Settings | null = null

export function loadSettings(): Settings {
  if (cache) return cache

  try {
    const raw = window.localStorage.getItem(KEY)
    cache = raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) } : { ...defaults }
  } catch {
    cache = { ...defaults }
  }

  return cache
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch }
  cache = next

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable. The value still holds for this session, which is enough.
  }

  return next
}
