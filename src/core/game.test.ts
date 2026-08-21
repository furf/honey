import { beforeEach, describe, expect, it } from 'vitest'
import { key } from './hex'
import {
  beginTrail,
  createGame,
  drainEvents,
  moveTrail,
  releaseTrail,
  step,
} from './game'
import type { Game, GameDeps } from './game'
import { createRng } from './rng'
import { stubDictionary, stubGenerator, testConfig, testLevel } from './testSupport'
import type { GameEvent, Level } from './types'

const CENTRE = key({ q: 0, r: 0 })
const EAST = key({ q: 1, r: 0 })
const NORTH_EAST = key({ q: 1, r: -1 })
const NORTH_WEST = key({ q: 0, r: -1 })
const WEST = key({ q: -1, r: 0 })

const config = testConfig

const levels: Level[] = [
  testLevel({ honeyThreshold: 0 }),
  testLevel({ honeyThreshold: 300 }),
]

/** TEAM lies along centre → east → north-east → west's neighbour chain. */
function makeGame(reseeds: string[] = ['Y']): Game {
  const deps: GameDeps = {
    config,
    levels,
    dictionary: stubDictionary(['TEAM', 'MATE', 'TEAMS', 'QUIT']),
    generator: stubGenerator(['Z'], reseeds),
    beeTypes: {},
    rng: createRng(1),
  }
  const game = createGame(deps, 1)
  paint(game, { [CENTRE]: 'T', [EAST]: 'E', [NORTH_EAST]: 'A', [NORTH_WEST]: 'M' })
  return game
}

function paint(game: Game, letters: Record<string, string>) {
  for (const [at, letter] of Object.entries(letters)) game.state.cells.get(at)!.letter = letter
}

/** Draw a whole word: press, drag, release. */
function draw(game: Game, trail: string[]) {
  beginTrail(game, trail[0]!)
  for (const at of trail.slice(1)) moveTrail(game, at)
  releaseTrail(game)
}

const TEAM = [CENTRE, EAST, NORTH_EAST, NORTH_WEST]

function eventsOfKind<K extends GameEvent['kind']>(events: GameEvent[], kind: K) {
  return events.filter((event): event is Extract<GameEvent, { kind: K }> => event.kind === kind)
}

let game: Game

beforeEach(() => {
  game = makeGame()
})

describe('createGame', () => {
  it('starts a full board, a full clock, an empty pot', () => {
    expect(game.state.cells.size).toBe(37)
    expect(game.state.clockMs).toBe(config.clock.durationMs)
    expect(game.state.pot).toBe(0)
    expect(game.state.screen).toBe('playing')
  })

  it('starts every cell with a letter and full honey', () => {
    for (const cell of game.state.cells.values()) {
      expect(cell.letter).not.toBe('')
      expect(cell.honey).toBe(100)
    }
  })
})

describe('scoring a word', () => {
  it('pays the pot and reports the word', () => {
    draw(game, TEAM)
    const scored = eventsOfKind(drainEvents(game), 'wordScored')

    expect(scored).toHaveLength(1)
    expect(scored[0]!.word).toBe('TEAM')
    expect(game.state.pot).toBe(80)
  })

  it('takes honey from every cell in the word and no others', () => {
    draw(game, TEAM)
    for (const at of TEAM) expect(game.state.cells.get(at)!.honey).toBe(80)
    expect(game.state.cells.get(WEST)!.honey).toBe(100)
  })

  it('adds the length’s bonus to the clock', () => {
    game.state.clockMs = 50_000
    draw(game, TEAM)

    expect(game.state.clockMs).toBe(51_000)
    expect(eventsOfKind(drainEvents(game), 'wordScored')[0]!.bonusMs).toBe(1_000)
  })

  it('never pushes the clock past the duration it started with', () => {
    draw(game, TEAM)
    expect(game.state.clockMs).toBe(config.clock.durationMs)
  })

  it('reports the bonus actually applied, not the one the length earned', () => {
    // Only 400ms of the second this word earns will fit. The player is told 400,
    // because that is what happened.
    game.state.clockMs = config.clock.durationMs - 400
    draw(game, TEAM)

    expect(game.state.clockMs).toBe(config.clock.durationMs)
    expect(eventsOfKind(drainEvents(game), 'wordScored')[0]!.bonusMs).toBe(400)
  })

  it('reports a bonus of zero when the clock is already full', () => {
    draw(game, TEAM)
    expect(eventsOfKind(drainEvents(game), 'wordScored')[0]!.bonusMs).toBe(0)
  })

  it('records the word and what it earned, for the end of the game', () => {
    draw(game, TEAM)
    expect(game.state.found).toEqual([{ word: 'TEAM', letters: 4, harvested: 80 }])
  })

  it('records nothing for a word that did not score', () => {
    draw(game, [CENTRE, EAST, NORTH_EAST])
    expect(game.state.found).toEqual([])
  })

  it('refuses the same word a second time', () => {
    draw(game, TEAM)
    const potAfterFirst = game.state.pot
    drainEvents(game)

    draw(game, TEAM)
    expect(game.state.pot).toBe(potAfterFirst)
    expect(eventsOfKind(drainEvents(game), 'wordRejected')[0]).toMatchObject({
      reason: 'alreadyPlayed',
    })
  })

  it('accepts the same letters drawn as a different word', () => {
    paint(game, { [CENTRE]: 'M', [EAST]: 'A', [NORTH_EAST]: 'T', [NORTH_WEST]: 'E' })
    draw(game, TEAM)
    expect(eventsOfKind(drainEvents(game), 'wordScored')[0]!.word).toBe('MATE')
  })
})

describe('rejecting a trail', () => {
  it('reports a trail that is too short', () => {
    draw(game, [CENTRE, EAST, NORTH_EAST])
    expect(eventsOfKind(drainEvents(game), 'wordRejected')[0]).toMatchObject({
      reason: 'tooShort',
    })
  })

  it('reports letters that are not a word', () => {
    paint(game, { [CENTRE]: 'Z', [EAST]: 'Z', [NORTH_EAST]: 'Z', [NORTH_WEST]: 'Z' })
    draw(game, TEAM)
    expect(eventsOfKind(drainEvents(game), 'wordRejected')[0]).toMatchObject({
      reason: 'notAWord',
    })
  })

  it('costs no honey and no time', () => {
    game.state.clockMs = 50_000
    draw(game, [CENTRE, EAST, NORTH_EAST])

    expect(game.state.pot).toBe(0)
    expect(game.state.clockMs).toBe(50_000)
    expect(game.state.cells.get(CENTRE)!.honey).toBe(100)
  })
})

describe('reseeding', () => {
  it('reseeds a cell once its honey runs out, and refills it', () => {
    // 20% of capacity per word means the fifth word empties the cell.
    const words = ['TEAM', 'MATE', 'TEAMS', 'QUIT']
    game.deps.dictionary.has(words[0]!)

    for (let round = 0; round < 5; round++) {
      // Re-paint each round so a fresh word can be drawn through the same cells.
      game.state.played.clear()
      paint(game, { [CENTRE]: 'T', [EAST]: 'E', [NORTH_EAST]: 'A', [NORTH_WEST]: 'M' })
      draw(game, TEAM)
    }

    const events = drainEvents(game)
    const reseeds = eventsOfKind(events, 'cellReseeded')

    expect(reseeds.length).toBeGreaterThanOrEqual(4)
    for (const at of TEAM) expect(game.state.cells.get(at)!.honey).toBe(100)
  })

  it('reports what the letter changed from and to', () => {
    const cell = game.state.cells.get(CENTRE)!
    cell.honey = 20
    draw(game, TEAM)

    const reseed = eventsOfKind(drainEvents(game), 'cellReseeded').find(
      (event) => event.cellKey === CENTRE,
    )
    expect(reseed).toMatchObject({ from: 'T', to: 'Y' })
    expect(cell.letter).toBe('Y')
  })
})

describe('levels', () => {
  it('advances when the pot crosses a threshold', () => {
    game.state.pot = 250
    draw(game, TEAM)

    expect(game.state.levelIndex).toBe(1)
    expect(eventsOfKind(drainEvents(game), 'levelChanged')[0]).toMatchObject({ from: 0, to: 1 })
  })

  it('does not announce a level that has not changed', () => {
    draw(game, TEAM)
    expect(eventsOfKind(drainEvents(game), 'levelChanged')).toEqual([])
  })

  it('keeps the honeycomb across a level change', () => {
    game.state.pot = 250
    const before = [...game.state.cells.values()].map((cell) => cell.letter)
    draw(game, TEAM)
    const after = [...game.state.cells.values()].map((cell) => cell.letter)

    // Only cells in the word may differ, and only if they reseeded.
    expect(after.filter((letter, index) => letter !== before[index])).toHaveLength(0)
  })
})

describe('the clock and game over', () => {
  it('counts down in real time', () => {
    for (let i = 0; i < 60; i++) step(game, 16)
    expect(game.state.clockMs).toBe(config.clock.durationMs - 960)
  })

  /**
   * The bug this guards has happened here before, in the health drain this replaced.
   * The total must divide evenly by every step size, or the comparison is between
   * different durations and passes for the wrong reason.
   */
  it('reaches the same time however the steps are sized', () => {
    const remainingAfter = (stepMs: number) => {
      const fresh = makeGame()
      for (let elapsed = 0; elapsed < 3_168; elapsed += stepMs) step(fresh, stepMs)
      return fresh.state.clockMs
    }

    expect(remainingAfter(8)).toBe(remainingAfter(16))
    expect(remainingAfter(16)).toBe(remainingAfter(33))
  })

  it('ends the game when the clock reaches zero', () => {
    game.state.clockMs = 100
    step(game, 100)

    expect(game.state.clockMs).toBe(0)
    expect(game.state.screen).toBe('gameOver')
    expect(eventsOfKind(drainEvents(game), 'gameOver')).toHaveLength(1)
  })

  it('never counts below zero', () => {
    game.state.clockMs = 100
    step(game, 5_000)
    expect(game.state.clockMs).toBe(0)
  })

  it('announces game over exactly once', () => {
    for (let i = 0; i < 60 * 200; i++) step(game, 16)
    expect(eventsOfKind(drainEvents(game), 'gameOver')).toHaveLength(1)
  })

  it('accepts no input once the game is over', () => {
    game.state.clockMs = 0
    step(game, 16)
    drainEvents(game)

    draw(game, TEAM)
    expect(game.state.pot).toBe(0)
    expect(drainEvents(game)).toEqual([])
  })
})

describe('stings', () => {
  function putBeeOn(at: string, id = 7) {
    const [q, r] = at.split(',').map(Number)
    game.state.bees.push({
      id,
      typeId: 'forager',
      at: { q: q!, r: r! },
      cameFrom: null,
      turningTo: null,
      exiting: false,
      hops: 0,
      sipsTaken: 0,
      timerMs: 0,
      phase: 'hopping',
    })
  }

  it('voids the trail the moment it touches a bee', () => {
    putBeeOn(NORTH_EAST)
    beginTrail(game, CENTRE)
    moveTrail(game, EAST)
    moveTrail(game, NORTH_EAST)

    expect(game.state.trail).toEqual([])
    expect(game.state.clockMs).toBe(config.clock.durationMs - 5_000)
    expect(eventsOfKind(drainEvents(game), 'stung')[0]).toMatchObject({
      cellKey: NORTH_EAST,
      beeId: 7,
      timeLostMs: 5_000,
    })
  })

  it('harvests nothing from a stung trail', () => {
    putBeeOn(NORTH_WEST)
    draw(game, TEAM)

    expect(game.state.pot).toBe(0)
    expect(game.state.cells.get(CENTRE)!.honey).toBe(100)
  })

  it('ignores the rest of the drag until the player lifts', () => {
    // The pointer is still down. Without a latch the next move would begin a fresh
    // trail from the cell the player is being stung on.
    putBeeOn(EAST)
    beginTrail(game, CENTRE)
    moveTrail(game, EAST)
    drainEvents(game)

    moveTrail(game, NORTH_EAST)
    moveTrail(game, NORTH_WEST)

    expect(game.state.trail).toEqual([])
    expect(drainEvents(game)).toEqual([])
  })

  it('lets the next drag start normally', () => {
    putBeeOn(EAST)
    beginTrail(game, CENTRE)
    moveTrail(game, EAST)
    releaseTrail(game)
    drainEvents(game)

    paint(game, { [EAST]: 'E' })
    game.state.bees = []
    draw(game, TEAM)

    expect(eventsOfKind(drainEvents(game), 'wordScored')).toHaveLength(1)
  })

  it('stings a trail that begins on a bee', () => {
    putBeeOn(CENTRE)
    beginTrail(game, CENTRE)

    expect(game.state.trail).toEqual([])
    expect(eventsOfKind(drainEvents(game), 'stung')).toHaveLength(1)
  })

  it('ends the game if a sting takes the last of the clock', () => {
    game.state.clockMs = 3_000
    putBeeOn(CENTRE)
    beginTrail(game, CENTRE)

    expect(game.state.clockMs).toBe(0)
    expect(game.state.screen).toBe('gameOver')
  })

  it('reports only the time a sting could actually take', () => {
    game.state.clockMs = 3_000
    putBeeOn(CENTRE)
    beginTrail(game, CENTRE)

    expect(eventsOfKind(drainEvents(game), 'stung')[0]!.timeLostMs).toBe(3_000)
  })

  it('is not triggered by a bee still arriving or already leaving', () => {
    putBeeOn(EAST)
    game.state.bees[0]!.phase = 'arriving'

    beginTrail(game, CENTRE)
    moveTrail(game, EAST)

    expect(game.state.trail).toEqual([CENTRE, EAST])
  })
})

describe('determinism', () => {
  it('reaches the same state from the same seed and inputs', () => {
    const play = () => {
      const fresh = makeGame()
      draw(fresh, TEAM)
      for (let i = 0; i < 200; i++) step(fresh, 16)
      return {
        pot: fresh.state.pot,
        clockMs: fresh.state.clockMs,
        letters: [...fresh.state.cells.values()].map((cell) => cell.letter),
      }
    }
    expect(play()).toEqual(play())
  })
})
