import { useCallback, useEffect, useState } from 'react'
import { activeTheme } from '../themes'
import type { GameDeps } from '../core/types'
import { randomSeed } from '../core/rng'
import { createDeps, preloadDictionary } from './composition'
import { GameScreen } from './GameScreen'
import { WelcomeScreen } from './WelcomeScreen'
import './styles.css'

/**
 * Screen routing and nothing else.
 *
 * The theme is a build-time constant, not a preference or a URL parameter — see
 * docs/design/presentation.md.
 */
export function App() {
  const theme = activeTheme()

  const [screen, setScreen] = useState<'welcome' | 'playing'>('welcome')
  const [session, setSession] = useState<{ deps: GameDeps; seed: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The dictionary is the largest thing the game downloads, so it loads behind the
  // welcome screen rather than blocking first paint.
  useEffect(() => {
    let cancelled = false
    preloadDictionary()
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError('Could not load the dictionary.')
          setLoading(false)
          console.error(cause)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const start = useCallback((seed = randomSeed()) => {
    createDeps(seed)
      .then((next) => {
        setSession(next)
        setScreen('playing')
      })
      .catch((cause: unknown) => {
        setError('Could not start the game.')
        console.error(cause)
      })
  }, [])

  const goHome = useCallback(() => {
    setScreen('welcome')
    setSession(null)
  }, [])

  return (
    <main className="app">
      {screen === 'welcome' || !session ? (
        <WelcomeScreen theme={theme} loading={loading} error={error} onStart={() => start()} />
      ) : (
        <GameScreen
          // A new seed remounts the screen, which is exactly what starting over means.
          key={session.seed}
          deps={session.deps}
          seed={session.seed}
          theme={theme}
          onExit={goHome}
          onPlayAgain={() => start()}
        />
      )}
    </main>
  )
}
