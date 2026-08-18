import type { EnvironmentCache, Layout, Theme } from '../engine'
import {
  cellCentre,
  centredText,
  darken,
  easeOut,
  environmentById,
  fillHoney,
  lerp,
  pourHoney,
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
  /** Needed to draw honey as a fraction; the renderer must not assume a scale. */
  readonly cellCapacity: number
  /** Paints the backdrop once and blits it. Absent in tests, which draw directly. */
  readonly environments?: EnvironmentCache
  readonly dpr?: number
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
  if (input.environments) {
    input.environments.draw(ctx, environment, layout.width, layout.height, input.dpr ?? 1)
  } else {
    environment.draw(ctx, layout.width, layout.height, nowMs)
  }

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

/**
 * The colour a cell should wear right now, or null for its usual gold.
 *
 * The live trail wins over a fading flash: what the player is doing matters more than
 * what just happened.
 */
function stateColourOf(
  input: RenderInput,
  cellKey: string,
  flash: { flash: CellFlash; progress: number } | null,
): string | null {
  const { palette } = input.theme

  if (input.state.trail.includes(cellKey)) return palette.trailSelecting
  if (!flash) return null

  switch (flash.flash.kind) {
    case 'scored':
      return palette.trailScored
    case 'stung':
      return palette.trailStung
    case 'alreadyPlayed':
      return palette.trailAlreadyPlayed
    case 'notAWord':
      return palette.trailInvalid
    case 'reseeded':
    case 'tooShort':
      return null
  }
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
    // survives being drawn every frame on a mid-range phone.
    ctx.fillStyle = palette.cellShadow
    roundedHexPath(ctx, x, y + depth, size, radius)
    ctx.fill()

    // A cell in a trail, or flashing a verdict, takes that state's colour across its
    // whole face rather than only its border — the state should be unmissable. The
    // honey line stays legible because the filled and empty halves take two shades of
    // the same colour.
    const state = stateColourOf(input, cellKey, flash)
    const emptyFill = state ? darken(state, 0.55) : palette.cellFillEmpty
    const honeyFill = state ?? palette.cellFill

    // Empty wax, lit from within rather than filled flat: comb is translucent, and a
    // warm centre is most of what separates wax from plastic.
    const glow = ctx.createRadialGradient(x, y - size * 0.2, size * 0.1, x, y, size * 1.15)
    glow.addColorStop(0, state ? darken(state, 0.42) : palette.cellWaxLit)
    glow.addColorStop(1, emptyFill)
    ctx.fillStyle = glow
    roundedHexPath(ctx, x, y, size, radius)
    ctx.fill()

    const capacity = input.cellCapacity
    const drawn = effects.drawnHoney.get(cellKey) ?? cell.honey
    const fraction = capacity > 0 ? drawn / capacity : 0

    const disturbed = effects.honeyDisturbed.get(cellKey)
    const settle =
      disturbed === undefined
        ? 0
        : Math.max(0, 1 - (nowMs - disturbed) / render.honeyRippleMs)

    const honeyGradient = ctx.createLinearGradient(x, y - size, x, y + size)
    honeyGradient.addColorStop(0, honeyFill)
    honeyGradient.addColorStop(1, darken(honeyFill, 0.14))

    fillHoney(
      ctx,
      x,
      y,
      size,
      radius,
      {
        fraction,
        meniscus: render.honeyMeniscus,
        ripple: render.honeyRippleAmplitude * settle * settle,
        ripplePhase: (nowMs / render.honeyRipplePeriodMs) % (Math.PI * 2),
        waves: render.honeyRippleWaves,
        gloss: render.honeyGloss,
      },
      honeyGradient,
      palette.honeyGloss,
    )

    // A reseeded cell is refilled from above, not from the floor.
    if (flash?.flash.kind === 'reseeded') {
      const pour = 1 - Math.min(1, (flash.progress * flash.flash.durationMs) / render.honeyPourMs)
      pourHoney(ctx, x, y, size, radius, pour * 2, render.honeyPourWidth, honeyGradient)
    }

    // Light catching the upper rim of the wax.
    ctx.save()
    roundedHexPath(ctx, x, y, size, radius)
    ctx.clip()
    ctx.globalAlpha = render.waxGlow
    ctx.strokeStyle = palette.cellHighlight
    ctx.lineWidth = Math.max(1, size * render.waxRim * 2)
    roundedHexPath(ctx, x, y + size * 0.07, size * 0.93, radius)
    ctx.stroke()
    ctx.restore()

    ctx.strokeStyle = palette.cellEdge
    ctx.lineWidth = Math.max(1, size * 0.04)
    roundedHexPath(ctx, x, y, size, radius)
    ctx.stroke()

    if (flash) drawCellFlash(ctx, input, x, y, size, radius, flash)

    // A reseeding cell swaps its letter at the midpoint of the effect, so the old one
    // is gone before the new one appears rather than crossfading into mush. The new
    // letter then lands with a slight overshoot, because a letter changing quietly
    // under a player's thumb is easy to miss entirely.
    const reseeding = flash?.flash.kind === 'reseeded'
    const half = flash ? (flash.progress - 0.5) * 2 : 0
    const letterAlpha = reseeding ? Math.abs(half) : 1
    const letterScale =
      reseeding && half > 0 ? 1 + render.reseedPop * (1 - easeOut(half)) : 1

    if (input.sweepKind !== 'gameOver' && letterAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = alpha * letterAlpha
      if (letterScale !== 1) {
        ctx.translate(x, y)
        ctx.scale(letterScale, letterScale)
        ctx.translate(-x, -y)
      }
      const fontSize = size * typography.letterScale
      centredText(
        ctx,
        cell.letter.toUpperCase(),
        x,
        y,
        typography.letters.replace('1px', `${fontSize}px`),
        state ? palette.letterOnState : palette.letter,
      )
      ctx.restore()
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
      // Blink, so a letter changing is announced rather than merely happening.
      colour = palette.cellHighlight
      strength = Math.abs(Math.sin(progress * Math.PI * render.reseedBlinks)) * (1 - progress * 0.35)
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

/**
 * The selected cells.
 *
 * No connecting line. The cells themselves already carry the selection colour across
 * their whole face, and a ribbon drawn over the top of that was saying the same thing
 * twice while covering the letters underneath it.
 */
function drawTrail(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { state, theme, layout, render } = input
  if (state.trail.length === 0) return

  ctx.save()
  ctx.strokeStyle = theme.palette.trailSelecting
  ctx.lineWidth = Math.max(2, layout.size * render.trailRing)

  for (const cellKey of state.trail) {
    const cell = state.cells.get(cellKey)
    if (!cell) continue
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
  const { state, theme, layout, render, nowMs } = input
  if (state.bees.length === 0) return

  for (const bee of state.bees) {
    const placed = beePlacement(bee, input)
    if (!placed) continue

    const type = state.bees.find((candidate) => candidate.id === bee.id)!
    const spriteId = bee.exiting
      ? `bee.${type.typeId}.full`
      : `bee.${type.typeId}`
    const sprite = theme.sprites[spriteId] ?? theme.sprites[`bee.${type.typeId}`]
    if (!sprite) continue

    const phase = ((nowMs / 1000) * render.beeWingHz) % 1

    ctx.save()
    ctx.globalAlpha = placed.alpha
    // Offset towards the cell's upper left, overhanging the edge a little, so the
    // letter underneath stays readable — a centred bee hides the one thing the
    // player needs to see.
    ctx.translate(
      placed.x + layout.size * render.beeOffset.x,
      placed.y + layout.size * render.beeOffset.y,
    )
    ctx.rotate(placed.angle)
    sprite(ctx, layout.size * render.beeSize, phase)
    ctx.restore()
  }
}

/**
 * Where a bee is drawn, and which way it is pointing.
 *
 * Three motions, in order of precedence: flying in from beyond the rim, turning on the
 * spot towards its next cell, and gliding to it. The turn is separate from the glide
 * so a bee visibly commits to a direction before it moves — which is what makes its
 * next move readable rather than a surprise.
 */
function beePlacement(
  bee: Bee,
  input: RenderInput,
): { x: number; y: number; angle: number; alpha: number } | null {
  const { state, effects, layout, render, nowMs } = input

  const visual = effects.bees.get(bee.id)
  const target = state.cells.get(key(bee.at))
  if (!target) return null

  const to = cellCentre(layout, target.at)

  if (!visual) return { x: to.x, y: to.y, angle: 0, alpha: 1 }

  // ---- flying in from off-board ------------------------------------------
  if (nowMs < visual.enteringUntilMs) {
    const span = Math.max(1, visual.enteringUntilMs - visual.enteringFromMs)
    const progress = easeOut((nowMs - visual.enteringFromMs) / span)

    // Start outside the canvas, on the line running from the board's centre out
    // through the entry cell. Bees used to hover above an outer cell and snap onto
    // it, which read as appearing on top of the board rather than arriving at it.
    const dx = to.x - layout.origin.x
    const dy = to.y - layout.origin.y
    const distance = Math.hypot(dx, dy) || 1
    const reach = layout.size * render.beeEntryDistance

    const startX = to.x + (dx / distance) * reach
    const startY = to.y + (dy / distance) * reach

    visual.turnTo = Math.atan2(to.y - startY, to.x - startX) + Math.PI / 2

    return {
      x: lerp(startX, to.x, progress),
      y: lerp(startY, to.y, progress),
      angle: visual.turnTo,
      alpha: Math.min(1, 0.3 + progress),
    }
  }

  // ---- turning on the spot ------------------------------------------------
  if (bee.turningTo !== null) {
    const next = state.cells.get(bee.turningTo)
    if (next) {
      const ahead = cellCentre(layout, next.at)
      const wanted = Math.atan2(ahead.y - to.y, ahead.x - to.x) + Math.PI / 2
      if (Number.isNaN(visual.turnTo)) visual.turnTo = wanted
      else visual.turnTo = wanted

      const span = Math.max(1, visual.turnMs)
      const progress = Math.max(0, Math.min(1, (nowMs - visual.turnStartedMs) / span))
      const angle = visual.turnFrom + shortestTurn(visual.turnFrom, wanted) * easeOut(progress)

      return { x: to.x, y: to.y, angle, alpha: opacityOf(bee) }
    }
  }

  // ---- gliding between cells ----------------------------------------------
  const from = visual.fromKey ? state.cells.get(visual.fromKey) : undefined
  if (!from) {
    const angle = Number.isNaN(visual.turnTo) ? 0 : visual.turnTo
    return { x: to.x, y: to.y, angle, alpha: opacityOf(bee) }
  }

  const start = cellCentre(layout, from.at)
  const progress = Math.max(0, Math.min(1, (nowMs - visual.travelStartedMs) / render.beeTravelMs))
  const eased = easeOut(progress)

  // The sprite is drawn nose-up, so add a quarter turn to align it with the heading.
  const angle = Math.atan2(to.y - start.y, to.x - start.x) + Math.PI / 2
  visual.turnTo = angle

  return {
    x: lerp(start.x, to.x, eased),
    y: lerp(start.y, to.y, eased),
    angle,
    alpha: opacityOf(bee),
  }
}

/** Turn the short way round, so a bee never spins 350 degrees to face 10. */
function shortestTurn(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2)
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

function opacityOf(bee: Bee): number {
  return bee.phase === 'leaving' ? 0.55 : 1
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
