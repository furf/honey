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
  testLevel({ honeyThreshold: 0, healthDrainPerSecond: 2, drainPauseMs: 10_000 }),
  testLevel({ honeyThreshold: 300, healthDrainPerSecond: 4, drainPauseMs: 8_000 }),
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
  it('starts a full board, full health, empty pot', () => {
    expect(game.state.cells.size).toBe(37)
    expect(game.state.health).toBe(100)
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

  it('restores health and suspends the drain', () => {
    game.state.health = 50
    draw(game, TEAM)

    expect(game.state.health).toBe(58)
    expect(game.state.drainPauseRemainingMs).toBe(10_000)
    expect(game.state.drainRampElapsedMs).toBe(0)
  })

  it('never restores past full health', () => {
    draw(game, TEAM)
    expect(game.state.health).toBe(100)
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

  it('costs no honey and no health', () => {
    game.state.health = 50
    draw(game, [CENTRE, EAST, NORTH_EAST])

    expect(game.state.pot).toBe(0)
    expect(game.state.health).toBe(50)
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

describe('health and game over', () => {
  it('drains health over time', () => {
    game.state.drainPauseRemainingMs = 0
    for (let i = 0; i < 60; i++) step(game, 16)
    expect(game.state.health).toBeLessThan(100)
  })

  it('does not drain while the pause is running', () => {
    draw(game, TEAM)
    const health = game.state.health
    for (let i = 0; i < 60; i++) step(game, 16)
    expect(game.state.health).toBe(health)
  })

  it('ends the game when health reaches zero', () => {
    game.state.drainPauseRemainingMs = 0
    for (let i = 0; i < 60 * 120; i++) step(game, 16)

    expect(game.state.health).toBe(0)
    expect(game.state.screen).toBe('gameOver')
    expect(eventsOfKind(drainEvents(game), 'gameOver')).toHaveLength(1)
  })

  it('announces game over exactly once', () => {
    game.state.drainPauseRemainingMs = 0
    for (let i = 0; i < 60 * 200; i++) step(game, 16)
    expect(eventsOfKind(drainEvents(game), 'gameOver')).toHaveLength(1)
  })

  it('accepts no input once the game is over', () => {
    game.state.health = 0
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
      typeId: 'worker',
      at: { q: q!, r: r! },
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
    expect(game.state.health).toBe(85)
    expect(eventsOfKind(drainEvents(game), 'stung')[0]).toMatchObject({
      cellKey: NORTH_EAST,
      beeId: 7,
      healthLost: 15,
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

  it('ends the game if a sting takes the last of the health', () => {
    game.state.health = 10
    putBeeOn(CENTRE)
    beginTrail(game, CENTRE)

    expect(game.state.health).toBe(0)
    expect(game.state.screen).toBe('gameOver')
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
      fresh.state.drainPauseRemainingMs = 0
      for (let i = 0; i < 200; i++) step(fresh, 16)
      return {
        pot: fresh.state.pot,
        health: fresh.state.health,
        letters: [...fresh.state.cells.values()].map((cell) => cell.letter),
      }
    }
    expect(play()).toEqual(play())
  })
})
