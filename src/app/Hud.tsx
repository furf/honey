import type { CSSProperties } from 'react'
import { gameConfig } from '../config'

/**
 * Score, health, the trail preview, and mute.
 *
 * DOM rather than canvas, so text rendering and accessibility come for free. It reads
 * state at a throttled rate, never per frame.
 */

export interface HudProps {
  readonly pot: number
  readonly health: number
  /** Rises on every sting. The bar flashes once each time it changes. */
  readonly stings: number
  readonly word: string
  readonly preview: number
  readonly muted: boolean
  readonly onToggleMute: () => void
}

export function Hud({ pot, health, stings, word, preview, muted, onToggleMute }: HudProps) {
  const percent = Math.max(0, Math.min(100, (health / gameConfig.health.max) * 100))
  const state = percent > 50 ? 'good' : percent > 20 ? 'warn' : 'danger'

  return (
    <>
      <div className="hud hud--top">
        <div key={stings} className="health health--hit" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label="Health">
          <div className={`health__bar health__bar--${state}`} style={{ width: `${percent}%` }} />
          <span className="health__label">{Math.round(percent)}%</span>
        </div>

        <div className="pot" aria-label="Honey collected">
          <span className="pot__value">{pot.toLocaleString()}</span>
        </div>
      </div>

      {/*
        The trail preview sits in its own band between the header and the honeycomb,
        with the value beneath the word rather than beside it — a number alongside the
        letters competed with them for the same glance.

        The word is set as large as will fit: CSS divides the available width by the
        letter count, which needs no resize listener because it is expressed in vw.

        It sits on a dark plate because the band floats over whichever environment the
        level is showing, and white on a pale sky was the weakest contrast on screen.
      */}
      <div className="trail" aria-live="polite">
        {word && (
          <div className="trail__plate">
            <span
              className="trail__word"
              style={{ '--trail-len': Math.max(word.length, 3) } as CSSProperties}
            >
              {word}
            </span>
            {preview > 0 && <span className="trail__preview">+{preview.toLocaleString()}</span>}
          </div>
        )}
      </div>

      <button
        type="button"
        className="mute"
        onClick={onToggleMute}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </>
  )
}
