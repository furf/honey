/**
 * Drawing primitives.
 *
 * Deliberately ignorant of the game: these take geometry and style, never state. The
 * game-specific renderer lives in the composition root, which is the only place
 * allowed to know about honey, bees and words at the same time as pixels.
 */

/** Corner angles of a pointy-top hexagon, starting at the top vertex. */
const CORNERS = Array.from({ length: 6 }, (_, index) => {
  const angle = (Math.PI / 180) * (60 * index - 90)
  return { x: Math.cos(angle), y: Math.sin(angle) }
})

/** Trace a pointy-top hexagon centred on the origin point. */
export function hexPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.beginPath()
  for (let index = 0; index < CORNERS.length; index++) {
    const corner = CORNERS[index]!
    const px = x + corner.x * size
    const py = y + corner.y * size
    if (index === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/**
 * The same, with rounded corners.
 *
 * A hexagon with sharp points reads as a technical diagram. Rounding is most of what
 * makes the honeycomb feel like a physical, playable object.
 */
export function roundedHexPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
): void {
  ctx.beginPath()
  roundedHexSubpath(ctx, x, y, size, radius)
}

/**
 * The same outline, without starting a new path.
 *
 * Lets many hexagons be added to a single path and filled once, so overlapping cells
 * merge into one shape — a slab of comb rather than a pile of separate tiles, and one
 * shadow rather than nineteen.
 */
export function roundedHexSubpath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
): void {
  if (radius <= 0) {
    for (let index = 0; index < CORNERS.length; index++) {
      const corner = CORNERS[index]!
      const px = x + corner.x * size
      const py = y + corner.y * size
      if (index === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    return
  }

  const points = CORNERS.map((corner) => ({ x: x + corner.x * size, y: y + corner.y * size }))

  for (let index = 0; index < points.length; index++) {
    const current = points[index]!
    const next = points[(index + 1) % points.length]!
    const previous = points[(index + points.length - 1) % points.length]!

    const from = towards(current, previous, radius)
    const to = towards(current, next, radius)

    if (index === 0) ctx.moveTo(from.x, from.y)
    else ctx.lineTo(from.x, from.y)

    ctx.quadraticCurveTo(current.x, current.y, to.x, to.y)
  }
  ctx.closePath()
}

function towards(from: { x: number; y: number }, to: { x: number; y: number }, distance: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const clamped = Math.min(distance, length / 2)
  return { x: from.x + (dx / length) * clamped, y: from.y + (dy / length) * clamped }
}

/**
 * A liquid surface in a cell.
 *
 * Named for the shape, not the game: the engine draws geometry and never learns that
 * this happens to be honey.
 */
export interface LiquidSurface {
  /** 0..1 of the cell's height. */
  readonly fraction: number
  /** How far the surface bows, in cell radii. Liquids are not flat. */
  readonly meniscus: number
  /** Ripple height in cell radii, decaying to zero after a disturbance. */
  readonly ripple: number
  /** Ripple phase, so successive crests travel across the surface. */
  readonly ripplePhase: number
  readonly waves: number
  /** Strength of the specular band along the surface, 0 to 1. */
  readonly gloss: number
  /** Points sampled along the surface. More is smoother and slower. */
  readonly steps: number
}

/**
 * Fill a hexagon from the bottom with something that behaves like a liquid.
 *
 * A flat edge reads as coloured plastic. A liquid has a curved surface that catches
 * light and sloshes when its level changes, which is what makes a change of level an
 * event rather than a number quietly going down.
 *
 * Clipping to the hexagon rather than drawing a smaller one keeps the meter honest:
 * the filled area stays proportional to height.
 */
export function fillLiquid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
  surface: LiquidSurface,
  style: string | CanvasGradient,
  glossStyle: string,
): void {
  const fraction = Math.max(0, Math.min(1, surface.fraction))
  if (fraction <= 0) return

  ctx.save()
  roundedHexPath(ctx, x, y, size, radius)
  ctx.clip()

  const level = y + size - 2 * size * fraction
  const bow = size * surface.meniscus
  const left = x - size
  const right = x + size

  // The surface: a shallow bow, plus a decaying ripple riding on top of it.
  const surfaceAt = (t: number): number => {
    const curve = Math.sin(Math.PI * t) * bow
    const wave =
      Math.sin(t * Math.PI * surface.waves * 2 + surface.ripplePhase) *
      size *
      surface.ripple
    return level - curve + wave
  }

  const steps = Math.max(2, surface.steps)

  ctx.beginPath()
  ctx.moveTo(left, surfaceAt(0))
  for (let step = 1; step <= steps; step++) ctx.lineTo(left + (right - left) * (step / steps), surfaceAt(step / steps))
  ctx.lineTo(right, y + size * 1.2)
  ctx.lineTo(left, y + size * 1.2)
  ctx.closePath()

  ctx.fillStyle = style
  ctx.fill()

  // A specular band sitting just under the surface is most of what sells "wet".
  if (surface.gloss > 0 && fraction < 0.995) {
    ctx.globalAlpha = surface.gloss
    ctx.strokeStyle = glossStyle
    ctx.lineWidth = Math.max(1, size * 0.07)
    ctx.beginPath()
    ctx.moveTo(left, surfaceAt(0) + size * 0.05)
    for (let step = 1; step <= steps; step++) {
      ctx.lineTo(left + (right - left) * (step / steps), surfaceAt(step / steps) + size * 0.05)
    }
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * A stream falling into a cell, for the moment after it is refilled.
 *
 * Liquid arrives from above; a level that simply rose out of the floor reads as a bar
 * chart filling rather than a vessel being refilled.
 */
export function pourStream(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
  reach: number,
  width: number,
  style: string | CanvasGradient,
): void {
  if (reach <= 0) return

  ctx.save()
  roundedHexPath(ctx, x, y, size, radius)
  ctx.clip()

  const half = size * width
  const top = y - size
  const bottom = top + size * 2 * Math.min(1, reach)

  ctx.fillStyle = style
  ctx.beginPath()
  ctx.moveTo(x - half, top)
  ctx.lineTo(x + half, top)
  // Narrows as it falls, the way a real stream necks down.
  ctx.quadraticCurveTo(x + half * 0.7, bottom, x, bottom + half * 0.8)
  ctx.quadraticCurveTo(x - half * 0.7, bottom, x - half, top)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

/** Text centred on a point, with the baseline actually centred rather than guessed. */
export function centredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  style: string,
): void {
  ctx.save()
  ctx.font = font
  ctx.fillStyle = style
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.restore()
}

/**
 * Darken a colour towards black.
 *
 * Lets a state colour supply both halves of a cell — the honey portion and the empty
 * portion — so the honey boundary stays legible while the cell reads as blue, green or
 * red. Without it every theme would have to declare a second shade of every state.
 */
export function darken(colour: string, amount: number): string {
  const hex = colour.trim()
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return colour

  const expand = hex.length === 4
  const part = (index: number) => {
    const raw = expand
      ? hex[1 + index]! + hex[1 + index]!
      : hex.slice(1 + index * 2, 3 + index * 2)
    return Math.round(parseInt(raw, 16) * (1 - amount))
  }

  const channels = [part(0), part(1), part(2)]
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
}

/** Linear interpolation, used all over the animation code. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** Ease-out cubic: fast then settling, which is how most UI motion should feel. */
export function easeOut(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return 1 - Math.pow(1 - clamped, 3)
}

export function easeInOut(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2
}
