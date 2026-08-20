import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { cellCentre, cellNear, computeLayout } from '../engine'
import type { Layout } from '../engine'
import { createPackedDictionary, createWeightedBagGenerator } from '../content'
import { solve, toSolverBoard } from '../content/generation/solver'
import { beginTrail, createGame, drainEvents, moveTrail, releaseTrail } from '../core/game'
import type { Game, GameDeps, GameEvent } from '../core/types'
import { createRng } from '../core/rng'
import { beeTypes, gameConfig, levels } from '../config'
import { renderConfig } from '../config/render'
import { honeycombTheme } from '../themes/honeycomb'
import { createEffects } from './effects'
import { renderGame } from './render'

/**
 * End-to-end checks that the pieces actually fit.
 *
 * Everything below the app has its own tests; what is untested until here is the
 * wiring — that a point on screen resolves to the cell under it, that the renderer
 * survives real game state, and that a swipe traced over a real board scores the word
 * the solver said was there.
 */

const DATA = resolve(__dirname, '../content/dictionary/data')

let deps: GameDeps

beforeAll(() => {
  const buffer = readFileSync(resolve(DATA, 'words.bin'))
  const dictionary = createPackedDictionary(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )

  deps = {
    config: gameConfig,
    levels,
    dictionary,
    generator: createWeightedBagGenerator({
      dictionary,
      generation: gameConfig.generation,
      words: gameConfig.words,
    }),
    beeTypes,
    rng: createRng(2024),
  }
})

const layoutOptions = {
  rings: gameConfig.board.rings,
  margin: renderConfig.boardMargin,
  topInset: renderConfig.topInset,
  bottomInset: renderConfig.bottomInset,
}

/** A recording stand-in for a 2D context. Enough to run the renderer honestly. */
function fakeContext() {
  const calls: string[] = []
  const noop = (name: string) => (...args: unknown[]) => {
    calls.push(name)
    void args
  }

  const ctx = {
    calls,
    texts: [] as string[],
    save: noop('save'),
    restore: noop('restore'),
    translate: noop('translate'),
    scale: noop('scale'),
    rotate: noop('rotate'),
    beginPath: noop('beginPath'),
    closePath: noop('closePath'),
    moveTo: noop('moveTo'),
    lineTo: noop('lineTo'),
    quadraticCurveTo: noop('quadraticCurveTo'),
    arc: noop('arc'),
    ellipse: noop('ellipse'),
    fill: noop('fill'),
    stroke: noop('stroke'),
    clip: noop('clip'),
    fillRect: noop('fillRect'),
    clearRect: noop('clearRect'),
    setTransform: noop('setTransform'),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    fillText(text: string) {
      calls.push('fillText')
      ctx.texts.push(text)
    },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    globalAlpha: 1,
    globalCompositeOperation: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
  }

  return ctx
}

function renderOnce(game: Game, layout: Layout, sweepKind: 'intro' | 'play' | 'gameOver') {
  const ctx = fakeContext()
  renderGame(ctx as unknown as CanvasRenderingContext2D, {
    state: game.state,
    effects: createEffects(),
    theme: honeycombTheme,
    layout,
    render: renderConfig,
    environmentId: levels[0]!.environmentId,
    cellCapacity: gameConfig.honey.cellCapacity,
    beeTypes,
    reducedMotion: false,
    nowMs: 1000,
    sweep: 1,
    sweepKind,
  })
  return ctx
}

describe('layout and hit-testing', () => {
  const sizes: [number, number][] = [
    [390, 844], // phone portrait
    [844, 390], // phone landscape
    [768, 1024], // tablet
    [1440, 900], // desktop
  ]

  it.each(sizes)('resolves every cell centre back to that cell at %ix%i', (width, height) => {
    const layout = computeLayout(width, height, layoutOptions)
    const game = createGame(deps, 7)

    for (const [cellKey, cell] of game.state.cells) {
      const point = cellCentre(layout, cell.at)
      const hit = cellNear(layout, point, (probe) => game.state.cells.has(probe), 0)
      expect(hit, `centre of ${cellKey}`).toBe(cellKey)
    }
  })

  it.each(sizes)('keeps the whole board on screen at %ix%i', (width, height) => {
    const layout = computeLayout(width, height, layoutOptions)
    const game = createGame(deps, 7)

    for (const cell of game.state.cells.values()) {
      const { x, y } = cellCentre(layout, cell.at)
      expect(x - layout.size).toBeGreaterThanOrEqual(0)
      expect(x + layout.size).toBeLessThanOrEqual(width)
      expect(y - layout.size).toBeGreaterThanOrEqual(0)
      expect(y + layout.size).toBeLessThanOrEqual(height)
    }
  })

  it('returns null for a point off the board', () => {
    const layout = computeLayout(390, 844, layoutOptions)
    const game = createGame(deps, 7)
    const hit = cellNear(layout, { x: 2, y: 2 }, (probe) => game.state.cells.has(probe), 0)
    expect(hit).toBeNull()
  })
})

describe('renderer', () => {
  it('draws a letter for every cell', () => {
    const game = createGame(deps, 11)
    const layout = computeLayout(390, 844, layoutOptions)
    const ctx = renderOnce(game, layout, 'play')

    expect(ctx.texts).toHaveLength(game.state.cells.size)
  })

  it('draws no letters once the game is over', () => {
    // The spec asks for letters to disappear at the end.
    const game = createGame(deps, 11)
    const layout = computeLayout(390, 844, layoutOptions)
    const ctx = renderOnce(game, layout, 'gameOver')

    expect(ctx.texts).toHaveLength(0)
  })

  it('survives a board with a trail and bees on it', () => {
    const game = createGame(deps, 13)
    const layout = computeLayout(390, 844, layoutOptions)

    const [first, second] = [...game.state.cells.keys()]
    beginTrail(game, first!)
    moveTrail(game, game.adjacency.get(first!)![0]!)

    game.state.bees.push({
      id: 1,
      typeId: 'forager',
      at: game.state.cells.get(second!)!.at,
      cameFrom: null,
      turningTo: null,
      exiting: false,
      hops: 0,
      sipsTaken: 0,
      timerMs: 500,
      phase: 'hopping',
    })

    expect(() => renderOnce(game, layout, 'play')).not.toThrow()
  })
})

describe('a swipe traced over a real board', () => {
  /** Turn a solver path into the pointer positions a finger would produce. */
  function swipe(game: Game, layout: Layout, cellKeys: string[]) {
    const points = cellKeys.map((cellKey) => cellCentre(layout, game.state.cells.get(cellKey)!.at))
    const onBoard = (probe: string) => game.state.cells.has(probe)

    const first = cellNear(layout, points[0]!, onBoard, renderConfig.pointerTolerance)
    beginTrail(game, first!)

    for (const point of points.slice(1)) {
      // Sample along the way, as a real drag would, rather than jumping cell to cell.
      const hit = cellNear(layout, point, onBoard, renderConfig.pointerTolerance)
      if (hit) moveTrail(game, hit)
    }

    releaseTrail(game)
  }

  it('scores a word the solver found on that board', () => {
    const game = createGame(deps, 4242)
    const layout = computeLayout(390, 844, layoutOptions)

    const board = toSolverBoard(game.state.cells, game.adjacency)
    const { paths, common } = solve(board, deps.dictionary, gameConfig.words)

    const word = [...common][0]
    expect(word, 'the generated board should contain a common word').toBeDefined()

    const cellKeys = paths.get(word!)!.map((index) => board.keys[index]!)
    swipe(game, layout, cellKeys)

    const scored = drainEvents(game).filter(
      (event): event is Extract<GameEvent, { kind: 'wordScored' }> =>
        event.kind === 'wordScored',
    )

    expect(scored).toHaveLength(1)
    expect(scored[0]!.word).toBe(word)
    expect(game.state.pot).toBeGreaterThan(0)
  })

  it('scores many different words in one session', () => {
    const game = createGame(deps, 909)
    const layout = computeLayout(390, 844, layoutOptions)

    const board = toSolverBoard(game.state.cells, game.adjacency)
    const { paths, common } = solve(board, deps.dictionary, gameConfig.words)

    let scored = 0
    for (const word of [...common].slice(0, 8)) {
      // The board mutates as cells reseed, so re-check the word is still spellable.
      const cellKeys = paths.get(word)!.map((index) => board.keys[index]!)
      const stillThere = cellKeys.every((cellKey, index) => {
        const letter = game.state.cells.get(cellKey)!.letter
        return word.toUpperCase().startsWith(
          cellKeys.slice(0, index + 1).map((k) => game.state.cells.get(k)!.letter).join('').toUpperCase(),
        ) && letter.length > 0
      })
      if (!stillThere) continue

      swipe(game, layout, cellKeys)
      scored += drainEvents(game).filter((event) => event.kind === 'wordScored').length
    }

    expect(scored).toBeGreaterThan(2)
    expect(game.state.pot).toBeGreaterThan(0)
  })
})
