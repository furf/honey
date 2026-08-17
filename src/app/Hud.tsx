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
  readonly word: string
  readonly preview: number
  readonly muted: boolean
  readonly onToggleMute: () => void
}

export function Hud({ pot, health, word, preview, muted, onToggleMute }: HudProps) {
  const percent = Math.max(0, Math.min(100, (health / gameConfig.health.max) * 100))
  const state = percent > 50 ? 'good' : percent > 20 ? 'warn' : 'danger'

  return (
    <>
      <div className="hud hud--top">
        <div className="health" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label="Health">
          <div className={`health__bar health__bar--${state}`} style={{ width: `${percent}%` }} />
          <span className="health__label">{Math.round(percent)}%</span>
        </div>

        <div className="pot" aria-label="Honey collected">
          <span className="pot__value">{pot.toLocaleString()}</span>
        </div>
      </div>

      {/*
        The trail preview sits above the honeycomb. Once a trail could score it also
        shows what it is worth, which is how a player learns the economy — by watching
        the number move rather than being told.
      */}
      <div className="trail" aria-live="polite">
        {word && <span className="trail__word">{word}</span>}
        {preview > 0 && <span className="trail__preview">+{preview.toLocaleString()}</span>}
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
