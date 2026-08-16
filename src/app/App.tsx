import { useState } from 'react'
import type { Screen } from '../core/types'

/**
 * Composition root and screen routing.
 *
 * React owns only the screens and the HUD. The honeycomb itself is canvas, and the
 * rules live in src/core. See docs/adr/0002-layered-architecture.md.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>('welcome')

  return (
    <main className="app">
      {screen === 'welcome' && <Welcome onStart={() => setScreen('playing')} />}
      {screen === 'playing' && <PlayingPlaceholder onQuit={() => setScreen('welcome')} />}
    </main>
  )
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <section className="screen screen--welcome">
      <h1 className="logo">Honey</h1>
      <button className="button" type="button" onClick={onStart}>
        Start Game
      </button>
      <p className="copyright">© 2026 SPARKLER*FUN</p>
    </section>
  )
}

function PlayingPlaceholder({ onQuit }: { onQuit: () => void }) {
  return (
    <section className="screen">
      <p className="placeholder">The honeycomb goes here.</p>
      <button className="button button--quiet" type="button" onClick={onQuit}>
        Back
      </button>
    </section>
  )
}
