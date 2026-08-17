import type { Layout, Theme } from '../engine'
import {
  cellCentre,
  centredText,
  easeOut,
  environmentById,
  fillHexPortion,
  lerp,
  roundedHexPath,
} from '../engine'
import { key } from '../core/hex'
import type { Bee, Cell, GameState } from '../core/types'
import type { RenderConfig } from '../config/render'
import type { CellFlash, Effects } from './effects'

/**
 * Draws the game.
 *
 * This is the one place allowed to know about honey, bees and pixels at once — the
 * engine stays generic and the rules stay blind, so the coupling lives here by design.
 *
 * Layer order, bottom to top:
 *   environment -> fx-behind -> honeycomb -> honey -> letters -> trail -> bees -> fx-front
 *
 * The layer beneath the honeycomb is not decoration: voided letters fall behind the
 * board, which is impossible if effects only ever draw on top.
 */

export interface RenderInput {
  readonly state: GameState
  readonly effects: Effects
  readonly theme: Theme
  readonly layout: Layout
  readonly render: RenderConfig
  readonly environmentId: string
  readonly nowMs: number
  /** 0..1 sweep used by the intro and the game-over collapse. */
  readonly sweep: number
  readonly sweepKind: 'intro' | 'play' | 'gameOver'
}

export function renderGame(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { effects, theme, layout, render, nowMs } = input

  ctx.save()
  applyShake(ctx, effects, render, nowMs)

  const environment = environmentById(theme, input.environmentId)
  environment.draw(ctx, layout.width, layout.height, nowMs)

  drawFallingLetters(ctx, input)
  drawCells(ctx, input)
  drawTrail(ctx, input)
  drawBees(ctx, input)
  drawPopups(ctx, input)

  if (environment.tint) {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = environment.tint
    ctx.fillRect(0, 0, layout.width, layout.height)
    ctx.restore()
  }

  ctx.restore()
}

/**
 * A decaying shake.
 *
 * Amplitude falls to zero over the effect so the screen settles rather than stopping
 * dead, which would read as a dropped frame.
 */
function applyShake(
  ctx: CanvasRenderingContext2D,
  effects: Effects,
  render: RenderConfig,
  nowMs: number,
): void {
  if (nowMs >= effects.shakeUntilMs) return

  const progress = (nowMs - effects.shakeStartedMs) / render.shakeMs
  const amplitude = render.shakeAmplitude * (1 - easeOut(progress))
  // Deterministic wobble: derived from the clock so it does not jitter between frames
  // at the same instant, which matters when the loop renders twice for one step.
  ctx.translate(
    Math.sin(nowMs * 0.08) * amplitude,
    Math.cos(nowMs * 0.11) * amplitude * 0.6,
  )
}

/** How far through its life a flash is, or null if this cell has none. */
function flashFor(
  effects: Effects,
  cellKey: string,
  nowMs: number,
): { flash: CellFlash; progress: number } | null {
  for (let index = effects.flashes.length - 1; index >= 0; index--) {
    const flash = effects.flashes[index]!
    if (!flash.cellKeys.includes(cellKey)) continue
    const progress = (nowMs - flash.startedMs) / flash.durationMs
    if (progress >= 0 && progress <= 1) return { flash, progress }
  }
  return null
}

/** Per-ring reveal, so the honeycomb's structure reads as structure. */
function ringAlpha(input: RenderInput, cell: Cell): number {
  const { sweep, sweepKind } = input
  if (sweepKind === 'play') return 1

  const rings = 4
  const span = 1 / rings
  const start = sweepKind === 'intro' ? cell.ring * span * 0.6 : cell.ring * span * 0.6
  const local = Math.max(0, Math.min(1, (sweep - start) / (1 - start || 1)))

  return sweepKind === 'intro' ? easeOut(local) : 1 - easeOut(local)
}

function drawCells(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { state, effects, theme, layout, render, nowMs } = input
  const { palette, typography } = theme

  const size = layout.size * (1 - render.cellGap)
  const radius = size * render.cellCornerRadius
  const depth = size * render.cellDepth

  for (const [cellKey, cell] of state.cells) {
    const alpha = ringAlpha(input, cell)
    if (alpha <= 0.001) continue

    const { x, y } = cellCentre(layout, cell.at)
    const flash = flashFor(effects, cellKey, nowMs)

    ctx.save()
    ctx.globalAlpha = alpha

    if (input.sweepKind === 'intro') {
      const scale = lerp(0.4, 1, alpha)
      ctx.translate(x, y)
      ctx.scale(scale, scale)
      ctx.translate(-x, -y)
    }

    // Dimensionality: a dropped slab beneath the face, not a blur. Cheap, and it
    // survives being drawn 37 times a frame on a mid-range phone.
    ctx.fillStyle = palette.cellShadow
    roundedHexPath(ctx, x, y + depth, size, radius)
    ctx.fill()

    ctx.fillStyle = palette.cellFillEmpty
    roundedHexPath(ctx, x, y, size, radius)
    ctx.fill()

    const drawn = effects.drawnHoney.get(cellKey) ?? cell.honey
    const fraction = drawn / 100
    fillHexPortion(ctx, x, y, size, radius, fraction, palette.cellFill)

    // Inner highlight along the top edge.
    ctx.save()
    roundedHexPath(ctx, x, y, size, radius)
    ctx.clip()
    ctx.strokeStyle = palette.cellHighlight
    ctx.lineWidth = Math.max(1, size * 0.08)
    roundedHexPath(ctx, x, y + size * 0.06, size * 0.94, radius)
    ctx.stroke()
    ctx.restore()

    ctx.strokeStyle = palette.cellEdge
    ctx.lineWidth = Math.max(1, size * 0.045)
    roundedHexPath(ctx, x, y, size, radius)
    ctx.stroke()

    if (flash) drawCellFlash(ctx, input, x, y, size, radius, flash)

    // A reseeding cell swaps its letter at the midpoint of the effect, so the old one
    // is gone before the new one appears rather than crossfading into mush.
    const reseeding = flash?.flash.kind === 'reseeded'
    const letterAlpha = reseeding
      ? Math.abs(((flash?.progress ?? 0) - 0.5) * 2)
      : 1

    if (input.sweepKind !== 'gameOver' && letterAlpha > 0.01) {
      ctx.globalAlpha = alpha * letterAlpha
      const fontSize = size * typography.letterScale
      centredText(
        ctx,
        cell.letter.toUpperCase(),
        x,
        y,
        typography.letters.replace('1px', `${fontSize}px`),
        palette.letter,
      )
    }

    ctx.restore()
  }
}

function drawCellFlash(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  x: number,
  y: number,
  size: number,
  radius: number,
  found: { flash: CellFlash; progress: number },
): void {
  const { palette } = input.theme
  const { render } = input
  const { flash, progress } = found

  let colour: string
  let strength: number

  switch (flash.kind) {
    case 'scored': {
      // Blink rather than fade: a pulse train reads as celebration, a fade reads as
      // something ending.
      const pulse = Math.abs(Math.sin(progress * Math.PI * render.scoredBlinks))
      colour = palette.trailScored
      strength = pulse * (1 - progress * 0.3)
      break
    }
    case 'alreadyPlayed':
      colour = palette.trailAlreadyPlayed
      strength = 1 - easeOut(progress)
      break
    case 'notAWord':
      colour = palette.trailInvalid
      strength = (1 - easeOut(progress)) * 0.8
      break
    case 'stung':
      colour = palette.trailStung
      strength = 1 - easeOut(progress)
      break
    case 'reseeded':
      colour = palette.cellHighlight
      strength = Math.sin(progress * Math.PI) * 0.5
      break
    case 'tooShort':
      return
  }

  ctx.save()
  ctx.globalAlpha *= Math.max(0, Math.min(1, strength))
  ctx.strokeStyle = colour
  ctx.lineWidth = Math.max(2, size * 0.12)
  roundedHexPath(ctx, x, y, size, radius)
  ctx.stroke()
  ctx.restore()
}

/** The blue ribbon following the player's finger. */
function drawTrail(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { state, theme, layout, render } = input
  if (state.trail.length === 0) return

  const points = state.trail.map((cellKey) => {
    const cell = state.cells.get(cellKey)!
    return cellCentre(layout, cell.at)
  })

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = theme.palette.trailSelecting
  ctx.shadowColor = theme.palette.trailSelecting
  ctx.shadowBlur = layout.size * render.trailGlow

  if (points.length > 1) {
    ctx.lineWidth = layout.size * render.trailWidth
    ctx.beginPath()
    ctx.moveTo(points[0]!.x, points[0]!.y)
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  // Ring every selected cell, so the trail is legible even as a single tap.
  ctx.lineWidth = Math.max(2, layout.size * 0.1)
  for (const cellKey of state.trail) {
    const cell = state.cells.get(cellKey)!
    const { x, y } = cellCentre(layout, cell.at)
    roundedHexPath(
      ctx,
      x,
      y,
      layout.size * (1 - render.cellGap),
      layout.size * render.cellCornerRadius,
    )
    ctx.stroke()
  }

  ctx.restore()
}

function drawBees(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { state, effects, theme, layout, render, nowMs } = input
  if (state.bees.length === 0) return

  for (const bee of state.bees) {
    const position = beePosition(bee, input)
    if (!position) continue

    const type = bee.exiting ? 'bee.worker.full' : 'bee.worker'
    const sprite = theme.sprites[type] ?? theme.sprites['bee.worker']
    if (!sprite) continue

    const phase = ((nowMs / 1000) * render.beeWingHz) % 1
    const size = layout.size * render.beeSize

    ctx.save()
    ctx.globalAlpha = beeOpacity(bee, effects, nowMs, render)
    ctx.translate(position.x, position.y)
    // Face the way it is travelling, so a hop reads as flight rather than a slide.
    ctx.rotate(position.angle)
    sprite(ctx, size, phase)
    ctx.restore()
  }
}

/**
 * Where a bee is drawn, which lags where it logically is.
 *
 * It slides between cells over beeTravelMs rather than the whole hop interval, so it
 * settles on the cell well before it matters — a bee you can be stung by should look
 * like it is there.
 */
function beePosition(
  bee: Bee,
  input: RenderInput,
): { x: number; y: number; angle: number } | null {
  const { state, effects, layout, render, nowMs } = input

  const travel = effects.beeTravel.get(bee.id)
  const target = state.cells.get(key(bee.at))
  if (!target) return null

  const to = cellCentre(layout, target.at)

  if (!travel || travel.fromKey === null) {
    // Arriving: drop in from above, so the approach is visible before it can sting.
    if (bee.phase === 'arriving') {
      const type = 1 - Math.max(0, Math.min(1, (nowMs - (travel?.startedMs ?? nowMs)) / 400))
      return { x: to.x, y: to.y - layout.size * render.beeArriveDrop * type, angle: 0 }
    }
    return { x: to.x, y: to.y, angle: 0 }
  }

  const from = state.cells.get(travel.fromKey)
  if (!from) return { x: to.x, y: to.y, angle: 0 }

  const progress = Math.max(0, Math.min(1, (nowMs - travel.startedMs) / render.beeTravelMs))
  const eased = easeOut(progress)
  const start = cellCentre(layout, from.at)

  const x = lerp(start.x, to.x, eased)
  const y = lerp(start.y, to.y, eased)
  // The sprite is drawn nose-up, so add a quarter turn to align it with the heading.
  const angle = Math.atan2(to.y - start.y, to.x - start.x) + Math.PI / 2

  return { x, y, angle }
}

function beeOpacity(
  bee: Bee,
  effects: Effects,
  nowMs: number,
  render: RenderConfig,
): number {
  if (bee.phase === 'arriving') {
    const travel = effects.beeTravel.get(bee.id)
    const since = nowMs - (travel?.startedMs ?? nowMs)
    return Math.max(0.25, Math.min(1, since / render.beeTravelMs))
  }
  if (bee.phase === 'leaving') return 0.55
  return 1
}

/** Floating `+142` and `−10` numbers, rising from the cells they came from. */
function drawPopups(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { state, effects, theme, layout, render, nowMs } = input

  for (const popup of effects.popups) {
    const progress = (nowMs - popup.startedMs) / render.popupMs
    if (progress < 0 || progress > 1) continue

    const centres = popup.cellKeys
      .map((cellKey) => state.cells.get(cellKey))
      .filter((cell): cell is Cell => cell !== undefined)
      .map((cell) => cellCentre(layout, cell.at))
    if (centres.length === 0) continue

    const x = centres.reduce((sum, point) => sum + point.x, 0) / centres.length
    const y = centres.reduce((sum, point) => sum + point.y, 0) / centres.length

    const rise = layout.size * render.popupRise * easeOut(progress)
    const fontSize = layout.size * (popup.kind === 'harvest' ? 0.62 : 0.42)

    ctx.save()
    ctx.globalAlpha = 1 - easeOut(Math.max(0, (progress - 0.4) / 0.6))
    centredText(
      ctx,
      popup.text,
      x,
      y - rise,
      theme.typography.ui.replace('1px', `${fontSize}px`),
      popup.kind === 'harvest' ? theme.palette.hudGood : theme.palette.trailStung,
    )
    ctx.restore()
  }
}

/**
 * Letters shaken loose by a voided trail, falling behind the honeycomb.
 *
 * Drawn before the cells precisely so they pass behind them — the reason the render
 * stack has a layer underneath the board at all.
 */
function drawFallingLetters(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { state, effects, theme, layout, nowMs } = input

  for (const flash of effects.flashes) {
    if (flash.kind !== 'notAWord' && flash.kind !== 'stung') continue

    const progress = (nowMs - flash.startedMs) / flash.durationMs
    if (progress < 0 || progress > 1) continue

    flash.cellKeys.forEach((cellKey, index) => {
      const cell = state.cells.get(cellKey)
      if (!cell) return

      const { x, y } = cellCentre(layout, cell.at)
      // Stagger by position so the word comes apart rather than dropping as a block.
      const local = Math.max(0, Math.min(1, progress * 1.4 - index * 0.06))
      const fall = layout.size * 3 * local * local
      const drift = Math.sin(index * 2.1) * layout.size * 0.5 * local

      ctx.save()
      ctx.globalAlpha = (1 - local) * 0.85
      ctx.translate(x + drift, y + fall)
      ctx.rotate(Math.sin(index * 1.3) * local * 1.2)
      centredText(
        ctx,
        cell.letter.toUpperCase(),
        0,
        0,
        theme.typography.letters.replace('1px', `${layout.size * 0.7}px`),
        flash.kind === 'stung' ? theme.palette.trailStung : theme.palette.trailInvalid,
      )
      ctx.restore()
    })
  }
}
