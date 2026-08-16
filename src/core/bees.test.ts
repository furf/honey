import { beforeEach, describe, expect, it } from 'vitest'
import { isOnBoard } from './bees'
import { createGame, drainEvents, step } from './game'
import { key, ring } from './hex'
import { createRng } from './rng'
import {
  stubDictionary,
  stubGenerator,
  testBeeType,
  testConfig,
  testLevel,
} from './testSupport'
import type { BeeType, Game, GameDeps, GameEvent, Level, LevelBees } from './types'

function makeGame(options: { bees?: Partial<LevelBees>; type?: Partial<BeeType> } = {}): Game {
  const level: Level = testLevel({
    // Bees are the subject here; a draining bar would just end the run mid-test.
    healthDrainPerSecond: 0,
    bees: {
      types: ['worker'],
      min: 0,
      max: 1,
      spawnIntervalMs: 1000,
      ...options.bees,
    },
  })

  const deps: GameDeps = {
    config: testConfig,
    levels: [level],
    dictionary: stubDictionary(['TEAM']),
    generator: stubGenerator(['Z'], ['Y']),
    beeTypes: { worker: testBeeType(options.type) },
    rng: createRng(3),
  }

  return createGame(deps, 3)
}

/** Advance the simulation in fixed 16 ms steps. */
function run(game: Game, ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) step(game, 16)
}

function eventsOfKind<K extends GameEvent['kind']>(events: GameEvent[], kind: K) {
  return events.filter((event): event is Extract<GameEvent, { kind: K }> => event.kind === kind)
}

let game: Game

beforeEach(() => {
  game = makeGame()
})

describe('spawning', () => {
  it('spawns nothing on a level with no bee types', () => {
    const quiet = makeGame({ bees: { types: [], min: 0, max: 0 } })
    run(quiet, 60_000)
    expect(quiet.state.bees).toEqual([])
  })

  it('spawns once the interval has passed', () => {
    expect(game.state.bees).toHaveLength(0)
    run(game, 1100)
    expect(game.state.bees).toHaveLength(1)
  })

  it('spawns immediately when below the minimum', () => {
    const busy = makeGame({ bees: { min: 1, max: 2, spawnIntervalMs: 60_000 } })
    run(busy, 32)
    expect(busy.state.bees.length).toBeGreaterThanOrEqual(1)
  })

  it('never exceeds the maximum', () => {
    const busy = makeGame({ bees: { min: 0, max: 2, spawnIntervalMs: 200 } })
    for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
      step(busy, 16)
      expect(busy.state.bees.length).toBeLessThanOrEqual(2)
    }
  })

  it('enters on the outer ring, so a bee is never conjured mid-board', () => {
    run(game, 1100)
    expect(ring(game.state.bees[0]!.at)).toBe(testConfig.board.rings)
  })

  it('gives each bee its own id', () => {
    const busy = makeGame({ bees: { min: 0, max: 2, spawnIntervalMs: 200 } })
    const ids = new Set<number>()
    for (let elapsed = 0; elapsed < 30_000; elapsed += 16) {
      step(busy, 16)
      for (const bee of busy.state.bees) ids.add(bee.id)
    }
    expect(ids.size).toBeGreaterThan(2)
  })
})

describe('arriving', () => {
  it('cannot sting while still approaching', () => {
    // The approach is the telegraph. A bee that could sting on arrival would be an
    // ambush rather than a hazard the player can route around.
    run(game, 1100)
    const bee = game.state.bees[0]!
    expect(bee.phase).toBe('arriving')
    expect(isOnBoard(bee)).toBe(false)
  })

  it('lands after its arrival time and announces itself', () => {
    run(game, 1100)
    drainEvents(game)
    run(game, 1100)

    expect(eventsOfKind(drainEvents(game), 'beeArrived')).toHaveLength(1)
    expect(isOnBoard(game.state.bees[0]!)).toBe(true)
  })
})

describe('sipping', () => {
  it('takes a share of capacity from the cell it rests on', () => {
    run(game, 2200)
    const bee = game.state.bees[0]!
    const cellKey = key(bee.at)

    run(game, 1100)
    const sips = eventsOfKind(drainEvents(game), 'beeSipped')

    expect(sips.length).toBeGreaterThanOrEqual(1)
    expect(sips[0]!.taken).toBe(10)
    expect(game.state.cells.get(cellKey)!.honey).toBe(90)
  })

  it('gives the player nothing — honey a bee takes is gone', () => {
    run(game, 20_000)
    expect(game.state.pot).toBe(0)
  })

  it('counts down the sips it has left, so the swell can be drawn', () => {
    run(game, 20_000)
    const sips = eventsOfKind(drainEvents(game), 'beeSipped')
    const counts = sips.map((event) => event.sipsLeft)
    expect(counts[0]).toBe(5)
    expect(Math.min(...counts)).toBe(0)
  })

  it('never sips when its chance is zero, but still occupies a cell', () => {
    const shy = makeGame({ type: { sipChance: 0 } })
    run(shy, 20_000)

    expect(eventsOfKind(drainEvents(shy), 'beeSipped')).toEqual([])
    // A resting bee still blocks its cell, which is the point of a low sip chance.
    expect(shy.state.bees.some(isOnBoard) || shy.state.bees.length === 0).toBe(true)
  })

  it('reseeds a cell it drains to empty', () => {
    const bee = makeGame({ type: { sipPercent: 1 } })
    run(bee, 2200)
    const target = key(bee.state.bees[0]!.at)
    drainEvents(bee)

    run(bee, 1100)
    const reseeds = eventsOfKind(drainEvents(bee), 'cellReseeded')

    expect(reseeds.map((event) => event.cellKey)).toContain(target)
    expect(bee.state.cells.get(target)!.honey).toBe(100)
  })
})

describe('leaving', () => {
  it('leaves once it has filled up, and says so', () => {
    const greedy = makeGame({ type: { sipCapacity: 2 } })
    run(greedy, 30_000)

    const left = eventsOfKind(drainEvents(greedy), 'beeLeft')
    expect(left.length).toBeGreaterThanOrEqual(1)
    expect(left[0]!.full).toBe(true)
  })

  it('leaves when its heading carries it off the board', () => {
    // Never sips and never turns, so it flies straight across and out without ever
    // filling up. Steering it back on would have bees hugging the rim instead.
    const passing = makeGame({
      type: { sipChance: 0, turnChance: 0, sipCapacity: 99, hopIntervalMs: 100 },
      bees: { min: 1, max: 1, spawnIntervalMs: 100 },
    })
    run(passing, 30_000)

    const left = eventsOfKind(drainEvents(passing), 'beeLeft')
    expect(left.length).toBeGreaterThanOrEqual(1)
    expect(left.every((event) => event.full)).toBe(false)
  })

  it('removes the bee from the board once it has gone', () => {
    const greedy = makeGame({
      type: { sipCapacity: 1 },
      bees: { min: 1, max: 1, spawnIntervalMs: 100 },
    })
    run(greedy, 30_000)

    const left = eventsOfKind(drainEvents(greedy), 'beeLeft')
    expect(left.length).toBeGreaterThanOrEqual(1)

    const gone = new Set(left.map((event) => event.beeId))
    expect(greedy.state.bees.filter((bee) => gone.has(bee.id))).toEqual([])
  })

  it('cannot sting on its way out', () => {
    const greedy = makeGame({ type: { sipCapacity: 1 } })
    run(greedy, 5000)
    const leaving = greedy.state.bees.find((bee) => bee.phase === 'leaving')
    if (leaving) expect(isOnBoard(leaving)).toBe(false)
  })
})

describe('movement', () => {
  it('only ever stands on a cell that exists', () => {
    const wanderer = makeGame({
      type: { turnChance: 0.5, sipCapacity: 99, hopIntervalMs: 100 },
      bees: { min: 1, max: 2, spawnIntervalMs: 500 },
    })
    for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
      step(wanderer, 16)
      for (const bee of wanderer.state.bees) {
        expect(wanderer.state.cells.has(key(bee.at))).toBe(true)
      }
    }
  })

  it('moves to a neighbouring cell, never a distant one', () => {
    const wanderer = makeGame({
      type: { turnChance: 0.5, sipCapacity: 99, hopIntervalMs: 100, sipChance: 0 },
      bees: { min: 1, max: 1, spawnIntervalMs: 60_000 },
    })

    const previous = new Map<number, string>()
    for (let elapsed = 0; elapsed < 30_000; elapsed += 16) {
      step(wanderer, 16)
      for (const bee of wanderer.state.bees) {
        const at = key(bee.at)
        const before = previous.get(bee.id)
        if (before && before !== at) {
          expect(wanderer.adjacency.get(before)).toContain(at)
        }
        previous.set(bee.id, at)
      }
    }
  })

  it('crosses the board rather than loitering on one cell', () => {
    const passing = makeGame({
      type: { turnChance: 0, sipChance: 0, sipCapacity: 99, hopIntervalMs: 100 },
      bees: { min: 1, max: 1, spawnIntervalMs: 60_000 },
    })

    const visited = new Set<string>()
    for (let elapsed = 0; elapsed < 10_000; elapsed += 16) {
      step(passing, 16)
      for (const bee of passing.state.bees) visited.add(key(bee.at))
    }
    expect(visited.size).toBeGreaterThan(3)
  })
})

describe('determinism', () => {
  it('replays identically from the same seed', () => {
    const snapshot = () => {
      const fresh = makeGame({ bees: { min: 1, max: 2, spawnIntervalMs: 800 } })
      run(fresh, 30_000)
      return {
        bees: fresh.state.bees.map((bee) => ({ ...bee, at: { ...bee.at } })),
        honey: [...fresh.state.cells.values()].map((cell) => cell.honey),
      }
    }
    expect(snapshot()).toEqual(snapshot())
  })
})
