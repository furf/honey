/**
 * Axial coordinates for a pointy-top hexagonal grid.
 *
 * Pointy-top means every cell has a direct east and west neighbour and no direct
 * north or south — chosen so that the natural left-to-right swipe of reading a word
 * is always a legal move. See docs/design/gameplay.md.
 */

export interface Axial {
  readonly q: number
  readonly r: number
}

/**
 * The six neighbour directions, in clockwise order starting from east.
 * Order is stable because rendering and bee movement both index into it.
 */
export const DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 }, // east
  { q: 1, r: -1 }, // north-east
  { q: 0, r: -1 }, // north-west
  { q: -1, r: 0 }, // west
  { q: -1, r: 1 }, // south-west
  { q: 0, r: 1 }, // south-east
]

/** A stable string form, for use as a Map or Set key. */
export function key(a: Axial): string {
  return `${a.q},${a.r}`
}

export function equals(a: Axial, b: Axial): boolean {
  return a.q === b.q && a.r === b.r
}

export function add(a: Axial, b: Axial): Axial {
  return { q: a.q + b.q, r: a.r + b.r }
}

export function neighbours(a: Axial): Axial[] {
  return DIRECTIONS.map((d) => add(a, d))
}

export function areAdjacent(a: Axial, b: Axial): boolean {
  return distance(a, b) === 1
}

/** Distance in cells, via the implied cube coordinate s = -q - r. */
export function distance(a: Axial, b: Axial): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2
}

/** Which ring a coordinate sits on: 0 is the centre cell. */
export function ring(a: Axial): number {
  return distance(a, { q: 0, r: 0 })
}

/**
 * Every coordinate within `rings` of the centre, ordered from the centre outward.
 *
 * Ring order is load-bearing: the intro and game-over animations stagger outward by
 * ring, so consumers can rely on this ordering rather than re-deriving it.
 */
export function spiral(rings: number): Axial[] {
  const cells: Axial[] = [{ q: 0, r: 0 }]
  for (let radius = 1; radius <= rings; radius++) {
    // Start on the south-west spoke so the walk closes cleanly around the ring.
    let cursor = scale(DIRECTIONS[4]!, radius)
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < radius; step++) {
        cells.push(cursor)
        cursor = add(cursor, DIRECTIONS[side]!)
      }
    }
  }
  return cells
}

function scale(a: Axial, factor: number): Axial {
  return { q: a.q * factor, r: a.r * factor }
}

export interface Point {
  readonly x: number
  readonly y: number
}

/** Centre point of a cell, where `size` is the hexagon's circumradius. */
export function toPixel(a: Axial, size: number): Point {
  return {
    x: size * Math.sqrt(3) * (a.q + a.r / 2),
    y: size * (3 / 2) * a.r,
  }
}

/** The nearest cell to a point — the whole of pointer hit-testing. */
export function fromPixel(p: Point, size: number): Axial {
  const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / size
  const r = ((2 / 3) * p.y) / size
  return roundAxial(q, r)
}

/** Round fractional axial coordinates by rounding in cube space. */
function roundAxial(q: number, r: number): Axial {
  const s = -q - r
  let rq = Math.round(q)
  let rr = Math.round(r)
  const rs = Math.round(s)

  const dq = Math.abs(rq - q)
  const dr = Math.abs(rr - r)
  const ds = Math.abs(rs - s)

  // Discard whichever component drifted furthest, so the three still sum to zero.
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs

  // Math.round can yield -0, which compares equal to 0 but fails deep equality.
  return { q: noNegativeZero(rq), r: noNegativeZero(rr) }
}

function noNegativeZero(n: number): number {
  return n === 0 ? 0 : n
}

/** Bounding box of a board of `rings` rings, in pixels. */
export function boundsOf(rings: number, size: number): { width: number; height: number } {
  const width = Math.sqrt(3) * size * (2 * rings + 1)
  const height = size * (3 * rings + 2)
  return { width, height }
}
