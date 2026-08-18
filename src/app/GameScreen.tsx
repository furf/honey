import { useCallback, useEffect, useRef, useState } from 'react'
import { computeLayout, cellNear, createLoop, createSoundBank, createSurface } from '../engine'
import type { Layout, SoundBank, Surface, Theme } from '../engine'
import {
  beginTrail,
  createGame,
  currentLevel,
  drainEvents,
  moveTrail,
  releaseTrail,
  step,
} from '../core/game'
import type { Game, GameDeps } from '../core/types'
import { gameConfig } from '../config'
import { renderConfig } from '../config/render'
import { applyEvent, createEffects, easeHoney, pruneEffects } from './effects'
import { renderGame } from './render'
import { Hud } from './Hud'
import { GameOverOverlay } from './GameOverOverlay'
import { loadSettings, saveSettings } from './settings'

/**
 * The playing screen: canvas, input, loop.
 *
 * React owns only the chrome. The board is drawn to a canvas by the render loop, and
 * the HUD reads game state at a throttled rate rather than every frame — a re-render
 * per frame would put React on the hot path for no benefit.
 */

export interface GameScreenProps {
  readonly deps: GameDeps
  readonly seed: number
  readonly theme: Theme
  readonly onExit: () => void
  readonly onPlayAgain: () => void
}

/** The slice of state the HUD needs. Small, so comparing it is cheap. */
interface HudState {
  pot: number
  health: number
  levelIndex: number
  word: string
  preview: number
  gameOver: boolean
}

export function GameScreen({ deps, seed, theme, onExit, onPlayAgain }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const soundRef = useRef<SoundBank | null>(null)

  const [muted, setMuted] = useState(() => loadSettings().muted)
  const [hud, setHud] = useState<HudState>({
    pot: 0,
    health: gameConfig.health.max,
    levelIndex: 0,
    word: '',
    preview: 0,
    gameOver: false,
  })

  const toggleMute = useCallback(() => {
    setMuted((previous) => {
      const next = !previous
      soundRef.current?.setMuted(next)
      saveSettings({ muted: next })
      return next
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const sound = createSoundBank(theme.sounds)
    sound.setMuted(loadSettings().muted)
    soundRef.current = sound
    void sound.unlock()

    const game: Game = createGame(deps, seed)
    const effects = createEffects()

    let layout: Layout = computeLayout(1, 1, layoutOptions())
    const surfaceHandle = createSurface(canvas, (surface: Surface) => {
      layout = computeLayout(surface.width, surface.height, layoutOptions())
    })
    layout = computeLayout(
      surfaceHandle.surface.width,
      surfaceHandle.surface.height,
      layoutOptions(),
    )

    const startedMs = performance.now()
    let gameOverAtMs: number | null = null
    let lastHudMs = 0
    let previousFrameMs = startedMs

    sound.play('game.start')

    const loop = createLoop({
      hz: gameConfig.timing.simulationHz,
      maxCatchUpMs: 250,
      step: (dtMs) => {
        step(game, dtMs)
      },
      render: (_alpha, frameMs) => {
        const dtMs = Math.min(100, frameMs - previousFrameMs)
        previousFrameMs = frameMs

        for (const event of drainEvents(game)) {
          applyEvent(effects, event, {
            nowMs: frameMs,
            render: renderConfig,
            play: (name) => sound.play(name),
          })
          if (event.kind === 'gameOver') gameOverAtMs = frameMs
          if (event.kind === 'levelChanged') {
            sound.play(deps.levels[event.to]?.transition.sound ?? '')
          }
        }

        // Hand the current world to the audio engine each frame; it keeps whatever
        // is already playing, so a buzz never restarts and stutters.
        const environmentId = currentLevel(game).environmentId
        sound.setAmbient([
          ...(theme.music[environmentId] ?? []),
          ...game.state.bees
            .filter((bee) => bee.phase !== 'leaving')
            .map((bee) => deps.beeTypes[bee.typeId]?.ambientSound)
            .filter((name): name is string => name !== undefined),
        ])

        const honey = new Map<string, number>()
        for (const [cellKey, cell] of game.state.cells) honey.set(cellKey, cell.honey)
        easeHoney(effects, honey, dtMs, renderConfig)
        pruneEffects(effects, frameMs, renderConfig)

        const introProgress = (frameMs - startedMs) / renderConfig.introMs
        const overProgress =
          gameOverAtMs === null ? 0 : (frameMs - gameOverAtMs) / renderConfig.gameOverMs

        renderGame(surfaceHandle.surface.ctx, {
          state: game.state,
          effects,
          theme,
          layout,
          render: renderConfig,
          environmentId,
          cellCapacity: gameConfig.honey.cellCapacity,
          nowMs: frameMs,
          sweep: gameOverAtMs !== null ? Math.min(1, overProgress) : Math.min(1, introProgress),
          sweepKind:
            gameOverAtMs !== null ? 'gameOver' : introProgress < 1 ? 'intro' : 'play',
        })

        // Throttled so score and health changes never drive a re-render per frame.
        if (frameMs - lastHudMs >= 1000 / gameConfig.timing.hudUpdateHz) {
          lastHudMs = frameMs
          setHud(readHud(game))
        }
      },
    })

    loop.start()

    // ---- input -------------------------------------------------------------

    const onBoard = (cellKey: string) => game.state.cells.has(cellKey)

    const toLocal = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const cellUnder = (event: PointerEvent) =>
      cellNear(layout, toLocal(event), onBoard, renderConfig.pointerTolerance)

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      canvas.setPointerCapture(event.pointerId)
      void sound.unlock()

      const cellKey = cellUnder(event)
      if (cellKey) beginTrail(game, cellKey)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (game.state.trail.length === 0 && !game.state.dragVoided) return
      const cellKey = cellUnder(event)
      if (cellKey) moveTrail(game, cellKey)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      releaseTrail(game)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    // A cancelled pointer must resolve the trail too, or it hangs highlighted forever.
    canvas.addEventListener('pointercancel', onPointerUp)

    return () => {
      loop.stop()
      sound.setAmbient([])
      surfaceHandle.dispose()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      sound.dispose()
      soundRef.current = null
    }
  }, [deps, seed, theme])

  useEffect(() => {
    if (hud.gameOver) saveSettings({ highScore: Math.max(loadSettings().highScore, hud.pot) })
  }, [hud.gameOver, hud.pot])

  return (
    <div className="game">
      <canvas ref={canvasRef} className="game__canvas" />

      <Hud
        pot={hud.pot}
        health={hud.health}
        word={hud.word}
        preview={hud.preview}
        muted={muted}
        onToggleMute={toggleMute}
      />

      {hud.gameOver && (
        <GameOverOverlay
          pot={hud.pot}
          best={loadSettings().highScore}
          message={theme.strings.gameOver ?? 'Game over'}
          onPlayAgain={onPlayAgain}
          onHome={onExit}
        />
      )}
    </div>
  )
}

function layoutOptions() {
  return {
    rings: gameConfig.board.rings,
    margin: renderConfig.boardMargin,
    topInset: renderConfig.topInset,
    bottomInset: renderConfig.bottomInset,
  }
}

function readHud(game: Game): HudState {
  const { state } = game
  const word = state.trail
    .map((cellKey) => state.cells.get(cellKey)?.letter ?? '')
    .join('')
    .toUpperCase()

  return {
    pot: Math.round(state.pot),
    health: state.health,
    levelIndex: state.levelIndex,
    word,
    preview: previewValue(game),
    gameOver: state.screen === 'gameOver',
  }
}

/**
 * What the trail is currently worth.
 *
 * Shown only once the trail could actually score. Watching this number move as the
 * trail grows is how a player learns the economy, so it is worth computing eagerly.
 */
function previewValue(game: Game): number {
  const { state, deps } = game
  let letters = 0
  for (const cellKey of state.trail) letters += state.cells.get(cellKey)?.letter.length ?? 0
  if (letters < deps.config.words.minLetters) return 0

  const level = deps.levels[Math.min(state.levelIndex, deps.levels.length - 1)]!
  const perCell = deps.config.honey.cellCapacity * level.harvestPercent

  const table = deps.config.scoring.lengthMultipliers
  let multiplier = 1
  let bestKey = -Infinity
  for (const [rawKey, value] of Object.entries(table)) {
    const at = Number(rawKey)
    if (at <= letters && at > bestKey) {
      bestKey = at
      multiplier = value
    }
  }

  return Math.round(perCell * state.trail.length * multiplier)
}
