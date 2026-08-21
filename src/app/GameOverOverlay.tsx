/**
 * The end of a game.
 *
 * There is deliberately no auto-return timer. The spec originally called for going
 * back to the welcome screen after five seconds, which would have left Play Again on
 * screen too briefly to read, let alone press.
 */

import { sortFound } from './foundWords'
import type { FoundWord } from '../core/types'

export interface GameOverOverlayProps {
  readonly pot: number
  readonly best: number
  readonly message: string
  readonly found: readonly FoundWord[]
  readonly onPlayAgain: () => void
  readonly onHome: () => void
}

export function GameOverOverlay({
  pot,
  best,
  message,
  found,
  onPlayAgain,
  onHome,
}: GameOverOverlayProps) {
  const isBest = pot >= best && pot > 0
  const words = sortFound(found)

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="overlay__card">
        <p className="overlay__message">{message}</p>

        <p className="overlay__score">{pot.toLocaleString()}</p>
        <p className="overlay__best">
          {isBest ? 'Your best yet' : `Best ${best.toLocaleString()}`}
        </p>

        {/*
          What the player actually wants to talk about afterwards. Longest first, so
          the best thing they did is the first thing they see. It scrolls rather than
          being capped: a good game should not be truncated to fit the card.
        */}
        {words.length > 0 && (
          <ul className="found" aria-label="Words found">
            {words.map((entry) => (
              <li key={entry.word} className="found__row">
                <span className="found__word">{entry.word}</span>
                <span className="found__value">{Math.round(entry.harvested).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="button" onClick={onPlayAgain} autoFocus>
          Play Again
        </button>
        <button type="button" className="button button--quiet" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  )
}
