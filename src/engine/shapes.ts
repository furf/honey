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
  if (radius <= 0) {
    hexPath(ctx, x, y, size)
    return
  }

  const points = CORNERS.map((corner) => ({ x: x + corner.x * size, y: y + corner.y * size }))

  ctx.beginPath()
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
 * Fill a hexagon partially from the bottom, for a honey level.
 *
 * Clipping to the hexagon rather than drawing a smaller one keeps the meter honest:
 * the filled area is proportional to height, and the shape still reads as one cell.
 */
export function fillHexPortion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
  fraction: number,
  style: string | CanvasGradient,
): void {
  const clamped = Math.max(0, Math.min(1, fraction))
  if (clamped <= 0) return

  ctx.save()
  roundedHexPath(ctx, x, y, size, radius)
  ctx.clip()

  const top = y + size - 2 * size * clamped
  ctx.fillStyle = style
  ctx.fillRect(x - size, top, size * 2, size * 2)
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
