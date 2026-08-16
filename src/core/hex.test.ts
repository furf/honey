import { describe, expect, it } from 'vitest'
import {
  areAdjacent,
  boundsOf,
  distance,
  fromPixel,
  key,
  neighbours,
  ring,
  spiral,
  toPixel,
} from './hex'

describe('spiral', () => {
  it('produces one centre cell plus 6, 12 and 18 per ring', () => {
    expect(spiral(0)).toHaveLength(1)
    expect(spiral(1)).toHaveLength(7)
    expect(spiral(2)).toHaveLength(19)
    expect(spiral(3)).toHaveLength(37)
  })

  it('contains no duplicates', () => {
    const cells = spiral(3)
    expect(new Set(cells.map(key)).size).toBe(cells.length)
  })

  it('orders cells outward by ring, so animations can stagger on it', () => {
    const rings = spiral(3).map(ring)
    expect(rings).toEqual([...rings].sort((a, b) => a - b))
  })
})

describe('adjacency', () => {
  it('gives every cell exactly six neighbours', () => {
    for (const cell of spiral(3)) {
      expect(neighbours(cell)).toHaveLength(6)
      expect(neighbours(cell).every((n) => areAdjacent(cell, n))).toBe(true)
    }
  })

  it('gives interior cells six neighbours that are all on the board', () => {
    const onBoard = new Set(spiral(3).map(key))
    // Every cell within ring 2 is fully surrounded on a 3-ring board.
    for (const cell of spiral(2)) {
      expect(neighbours(cell).filter((n) => onBoard.has(key(n)))).toHaveLength(6)
    }
  })

  it('does not treat a cell as adjacent to itself', () => {
    expect(areAdjacent({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(false)
  })

  it('measures distance across the board as the ring number', () => {
    for (const cell of spiral(3)) {
      expect(distance({ q: 0, r: 0 }, cell)).toBe(ring(cell))
    }
  })
})

describe('pixel conversion', () => {
  const size = 40

  it('round-trips every cell through pixel space', () => {
    for (const cell of spiral(3)) {
      expect(fromPixel(toPixel(cell, size), size)).toEqual(cell)
    }
  })

  it('resolves a point near a cell centre to that cell', () => {
    for (const cell of spiral(3)) {
      const centre = toPixel(cell, size)
      // A quarter of a hex width off-centre must still land on the same cell.
      const nudged = { x: centre.x + size * 0.25, y: centre.y - size * 0.25 }
      expect(fromPixel(nudged, size)).toEqual(cell)
    }
  })

  it('reports bounds that contain every cell', () => {
    const { width, height } = boundsOf(3, size)
    for (const cell of spiral(3)) {
      const { x, y } = toPixel(cell, size)
      expect(Math.abs(x)).toBeLessThanOrEqual(width / 2)
      expect(Math.abs(y)).toBeLessThanOrEqual(height / 2)
    }
  })
})
