import { key, neighbours, ring, spiral } from './hex'
import type { Cell } from './types'

/**
 * The honeycomb: rings 0 through n around a centre cell.
 *
 * Cells are created in ring order and positions never change for the life of a game,
 * so the map's iteration order is stable and animations can stagger outward on it.
 */
export function createHoneycomb(rings: number, capacity: number): Map<string, Cell> {
  const cells = new Map<string, Cell>()
  for (const at of spiral(rings)) {
    cells.set(key(at), {
      at,
      ring: ring(at),
      letter: '',
      honey: capacity,
      history: [],
    })
  }
  return cells
}

/**
 * Neighbour keys for every cell, excluding neighbours that fall off the board.
 *
 * Precomputed once because the solver walks adjacency millions of times per board and
 * must not be recomputing hex arithmetic inside its inner loop.
 */
export function buildAdjacency(cells: ReadonlyMap<string, Cell>): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()
  for (const [cellKey, cell] of cells) {
    const near: string[] = []
    for (const neighbour of neighbours(cell.at)) {
      const neighbourKey = key(neighbour)
      if (cells.has(neighbourKey)) near.push(neighbourKey)
    }
    adjacency.set(cellKey, near)
  }
  return adjacency
}

/** Cells grouped by ring, outermost last. */
export function cellsByRing(cells: ReadonlyMap<string, Cell>): Cell[][] {
  const rings: Cell[][] = []
  for (const cell of cells.values()) {
    ;(rings[cell.ring] ??= []).push(cell)
  }
  return rings
}
