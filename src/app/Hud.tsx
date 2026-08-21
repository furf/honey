import type { CSSProperties } from 'react'

/**
 * The clock, the pot, the trail preview, and mute.
 *
 * DOM rather than canvas, so text rendering and accessibility come for free. It reads
 * state at a throttled rate, never per frame.
 */

export interface HudProps {
  readonly pot: number
  /** Milliseconds left. Formatted here, because only presentation cares about m:ss. */
  readonly clockMs: number
  readonly word: string
  readonly preview: number
  readonly muted: boolean
  readonly onToggleMute: () => void
}

/**
 * Milliseconds as minutes and seconds.
 *
 * Rounded up, so a running game never shows 0:00 and a fresh one shows the full
 * duration rather than a second less. Zero is then reached only when the clock
 * genuinely is zero, which is the moment the game ends.
 */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Drawn rather than typed as an emoji.
 *
 * An emoji stopwatch renders as a different picture on every platform and carries its
 * own colour, so it could neither sit beside Nunito nor take the warning states. This
 * one is stroked in the current text colour and inherits both.
 */
function Stopwatch() {
  return (
    <svg className="clock__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="14" r="7.5" />
        <path d="M9.5 2.5h5" />
        <path d="M12 2.5v4" />
        <path d="M18.5 8 20 6.5" />
        <path d="M12 10.5V14h2.5" />
      </g>
    </svg>
  )
}

export function Hud({ pot, clockMs, word, preview, muted, onToggleMute }: HudProps) {
  const label = formatClock(clockMs)

  return (
    <>
      <div className="hud hud--top">
        <div className="clock" role="timer" aria-label={`Time remaining ${label}`}>
          <Stopwatch />
          <span className="clock__value">{label}</span>
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
