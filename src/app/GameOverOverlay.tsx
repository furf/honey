/**
 * The end of a game.
 *
 * There is deliberately no auto-return timer. The spec originally called for going
 * back to the welcome screen after five seconds, which would have left Play Again on
 * screen too briefly to read, let alone press.
 */

export interface GameOverOverlayProps {
  readonly pot: number
  readonly best: number
  readonly message: string
  readonly onPlayAgain: () => void
  readonly onHome: () => void
}

export function GameOverOverlay({
  pot,
  best,
  message,
  onPlayAgain,
  onHome,
}: GameOverOverlayProps) {
  const isBest = pot >= best && pot > 0

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="overlay__card">
        <p className="overlay__message">{message}</p>

        <p className="overlay__score">{pot.toLocaleString()}</p>
        <p className="overlay__best">
          {isBest ? 'Your best yet' : `Best ${best.toLocaleString()}`}
        </p>

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
