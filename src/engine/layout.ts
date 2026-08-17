import { boundsOf, fromPixel, key, toPixel } from '../core/hex'
import type { Axial, Point } from '../core/hex'

/**
 * Where the honeycomb sits on the canvas, and which cell a pointer is over.
 *
 * Layout is recomputed only on resize. Hit-testing is a coordinate conversion rather
 * than a search, so a drag costs the same whatever the board size.
 */

export interface Layout {
  /** Circumradius of one hexagon, in CSS pixels. */
  readonly size: number
  /** Canvas position of the board's centre. */
  readonly origin: Point
  readonly width: number
  readonly height: number
}

export interface LayoutOptions {
  readonly rings: number
  /** Fraction of the shorter axis left as breathing room. */
  readonly margin: number
  /** Space reserved above the board for the trail preview, in CSS pixels. */
  readonly topInset: number
  /** Space reserved below the board, in CSS pixels. */
  readonly bottomInset: number
}

/**
 * Fit the honeycomb into the available space.
 *
 * The board is sized against both axes rather than just the width, because a phone in
 * landscape is height-constrained and would otherwise overflow.
 */
export function computeLayout(
  width: number,
  height: number,
  options: LayoutOptions,
): Layout {
  const usableHeight = Math.max(0, height - options.topInset - options.bottomInset)
  const available = Math.min(width, usableHeight) * (1 - options.margin)

  // Bounds at unit size, so the ratio scales linearly.
  const unit = boundsOf(options.rings, 1)
  const size = Math.max(1, Math.min(available / unit.width, available / unit.height))

  return {
    size,
    origin: {
      x: width / 2,
      y: options.topInset + usableHeight / 2,
    },
    width,
    height,
  }
}

/** Canvas position of a cell's centre. */
export function cellCentre(layout: Layout, at: Axial): Point {
  const local = toPixel(at, layout.size)
  return { x: layout.origin.x + local.x, y: layout.origin.y + local.y }
}

/**
 * Which cell a canvas point is over, or null if it is off the board.
 *
 * `onBoard` decides membership, so the layout never needs to know the board's shape.
 */
export function cellAt(
  layout: Layout,
  point: Point,
  onBoard: (cellKey: string) => boolean,
): string | null {
  const local = { x: point.x - layout.origin.x, y: point.y - layout.origin.y }
  const at = fromPixel(local, layout.size)
  const cellKey = key(at)
  return onBoard(cellKey) ? cellKey : null
}

/**
 * The same, but forgiving near a cell's edge.
 *
 * A finger is wide and a hexagon's corners are sharp. Without a tolerance, dragging
 * along a row of cells drops out whenever the pointer clips a corner, and the trail
 * appears to stutter.
 */
export function cellNear(
  layout: Layout,
  point: Point,
  onBoard: (cellKey: string) => boolean,
  tolerance: number,
): string | null {
  const direct = cellAt(layout, point, onBoard)
  if (direct !== null) return direct

  // Probe a short way towards the board's centre, which is where the player's finger
  // is most likely to have drifted from.
  const towards = {
    x: point.x + (layout.origin.x - point.x) * tolerance,
    y: point.y + (layout.origin.y - point.y) * tolerance,
  }
  return cellAt(layout, towards, onBoard)
}
