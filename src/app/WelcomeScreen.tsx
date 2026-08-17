import { useEffect, useRef } from 'react'
import type { Theme } from '../engine'
import { createSurface } from '../engine'
import { loadSettings } from './settings'

/**
 * The welcome screen.
 *
 * The wordmark is drawn to a canvas by the theme rather than set in HTML, so a theme
 * can change the branding as completely as it changes the board.
 */

export interface WelcomeScreenProps {
  readonly theme: Theme
  readonly loading: boolean
  readonly error: string | null
  readonly onStart: () => void
}

export function WelcomeScreen({ theme, loading, error, onStart }: WelcomeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const best = loadSettings().highScore

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handle = createSurface(canvas, (surface) => {
      surface.ctx.clearRect(0, 0, surface.width, surface.height)
      theme.logo(surface.ctx, surface.width, surface.height)
    })

    theme.logo(handle.surface.ctx, handle.surface.width, handle.surface.height)
    return () => handle.dispose()
  }, [theme])

  return (
    <section className="screen screen--welcome">
      <canvas ref={canvasRef} className="welcome__logo" />

      <p className="welcome__tagline">{theme.strings.tagline}</p>

      <button type="button" className="button" onClick={onStart} disabled={loading || !!error}>
        {loading ? 'Loading…' : 'Start Game'}
      </button>

      {error && <p className="welcome__error">{error}</p>}
      {best > 0 && <p className="welcome__best">Best {best.toLocaleString()}</p>}

      <p className="copyright">{theme.strings.copyright}</p>
    </section>
  )
}
