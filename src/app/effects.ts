import type { GameEvent, RejectionReason } from '../core/types'
import type { RenderConfig } from '../config/render'

/**
 * Transient visuals, driven by what the rules did.
 *
 * The core emits events and never knows anything was drawn; this turns those events
 * into things with a lifetime. Keeping it separate means the renderer stays a pure
 * function of (state, effects, clock) and can be reasoned about one frame at a time.
 */

export type CellFlashKind = 'scored' | RejectionReason | 'stung' | 'reseeded'

export interface CellFlash {
  readonly cellKeys: readonly string[]
  readonly kind: CellFlashKind
  readonly startedMs: number
  readonly durationMs: number
}

export interface Popup {
  readonly text: string
  readonly cellKeys: readonly string[]
  readonly startedMs: number
  readonly kind: 'harvest' | 'sip'
}

export interface BeeTravel {
  readonly fromKey: string | null
  readonly toKey: string
  readonly startedMs: number
}

export interface Effects {
  flashes: CellFlash[]
  popups: Popup[]
  /** Where each bee is visually, which lags where it logically is. */
  beeTravel: Map<number, BeeTravel>
  /** Cell honey as drawn, easing towards the real value. */
  drawnHoney: Map<string, number>
  shakeUntilMs: number
  shakeStartedMs: number
}

export function createEffects(): Effects {
  return {
    flashes: [],
    popups: [],
    beeTravel: new Map(),
    drawnHoney: new Map(),
    shakeUntilMs: 0,
    shakeStartedMs: 0,
  }
}

export interface EffectContext {
  readonly nowMs: number
  readonly render: RenderConfig
  /** Called for each sound the event implies, so audio stays out of the renderer. */
  play(sound: string): void
}

/** Fold one event into the effect list. */
export function applyEvent(effects: Effects, event: GameEvent, ctx: EffectContext): void {
  const { nowMs, render } = ctx

  switch (event.kind) {
    case 'trailStarted':
    case 'trailExtended':
      ctx.play('trail.step')
      break

    case 'wordScored':
      effects.flashes.push({
        cellKeys: event.cellKeys,
        kind: 'scored',
        startedMs: nowMs,
        durationMs: render.scoredFlashMs,
      })
      effects.popups.push({
        text: `+${Math.round(event.harvested)}`,
        cellKeys: event.cellKeys,
        startedMs: nowMs,
        kind: 'harvest',
      })
      ctx.play('word.scored')
      break

    case 'wordRejected':
      // Too short is a change of mind, not a mistake: no sound, no colour.
      if (event.reason === 'tooShort') break
      effects.flashes.push({
        cellKeys: event.cellKeys,
        kind: event.reason,
        startedMs: nowMs,
        durationMs: render.rejectedMs,
      })
      ctx.play(event.reason === 'alreadyPlayed' ? 'word.alreadyPlayed' : 'word.invalid')
      break

    case 'stung':
      effects.flashes.push({
        cellKeys: [event.cellKey],
        kind: 'stung',
        startedMs: nowMs,
        durationMs: render.stungMs,
      })
      effects.shakeStartedMs = nowMs
      effects.shakeUntilMs = nowMs + render.shakeMs
      ctx.play('bee.sting')
      break

    case 'cellReseeded':
      effects.flashes.push({
        cellKeys: [event.cellKey],
        kind: 'reseeded',
        startedMs: nowMs,
        durationMs: render.reseedMs,
      })
      ctx.play('cell.reseeded')
      break

    case 'beeArrived':
      effects.beeTravel.set(event.beeId, {
        fromKey: null,
        toKey: event.cellKey,
        startedMs: nowMs,
      })
      break

    case 'beeMoved': {
      const previous = effects.beeTravel.get(event.beeId)
      effects.beeTravel.set(event.beeId, {
        fromKey: previous?.toKey ?? null,
        toKey: event.cellKey,
        startedMs: nowMs,
      })
      break
    }

    case 'beeSipped':
      effects.popups.push({
        text: `−${Math.round(event.taken)}`,
        cellKeys: [event.cellKey],
        startedMs: nowMs,
        kind: 'sip',
      })
      ctx.play('bee.sip')
      break

    case 'beeLeft':
      effects.beeTravel.delete(event.beeId)
      break

    case 'levelChanged':
      break

    case 'gameOver':
      ctx.play('game.over')
      break

    case 'trailBacktracked':
      break
  }
}

/** Drop anything that has finished. Cheap, and called once per frame. */
export function pruneEffects(effects: Effects, nowMs: number, render: RenderConfig): void {
  effects.flashes = effects.flashes.filter(
    (flash) => nowMs - flash.startedMs < flash.durationMs,
  )
  effects.popups = effects.popups.filter((popup) => nowMs - popup.startedMs < render.popupMs)
}

/**
 * Ease each cell's drawn honey towards its real level.
 *
 * Framerate-independent smoothing: the fraction covered depends on elapsed time, not
 * on how many frames happened to fit into it.
 */
export function easeHoney(
  effects: Effects,
  actual: ReadonlyMap<string, number>,
  dtMs: number,
  render: RenderConfig,
): void {
  const rate = render.honeyTweenMs > 0 ? 1 - Math.exp(-dtMs / render.honeyTweenMs) : 1

  for (const [cellKey, target] of actual) {
    const current = effects.drawnHoney.get(cellKey)
    if (current === undefined) {
      effects.drawnHoney.set(cellKey, target)
      continue
    }
    // Snap when close, so a cell does not sit forever a hair away from full.
    const next = Math.abs(target - current) < 0.5 ? target : current + (target - current) * rate
    effects.drawnHoney.set(cellKey, next)
  }
}
