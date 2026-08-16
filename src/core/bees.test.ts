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

interface Options {
  bees?: Partial<LevelBees>
  type?: Partial<BeeType>
  seed?: number
}

function makeGame(options: Options = {}): Game {
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
    rng: createRng(options.seed ?? 3),
  }

  return createGame(deps, options.seed ?? 3)
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
    const counts = eventsOfKind(drainEvents(game), 'beeSipped').map((event) => event.sipsLeft)
    expect(counts[0]).toBe(5)
    expect(Math.min(...counts)).toBe(0)
  })

  it('never sips when its chance is zero', () => {
    const shy = makeGame({ type: { sipChance: 0 } })
    run(shy, 20_000)
    expect(eventsOfKind(drainEvents(shy), 'beeSipped')).toEqual([])
  })

  it('reseeds a cell it drains to empty', () => {
    const thirsty = makeGame({ type: { sipPercent: 1 } })
    run(thirsty, 2200)
    const target = key(thirsty.state.bees[0]!.at)
    drainEvents(thirsty)

    run(thirsty, 1100)
    const reseeds = eventsOfKind(drainEvents(thirsty), 'cellReseeded')

    expect(reseeds.map((event) => event.cellKey)).toContain(target)
    expect(thirsty.state.cells.get(target)!.honey).toBe(100)
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

  it('gives up after its maximum hops, however little it collected', () => {
    // Without this bound a bee that never sips would never leave.
    const idler = makeGame({
      type: { sipChance: 0, sipCapacity: 99, maxHops: 4, hopIntervalMs: 100 },
      bees: { min: 1, max: 1, spawnIntervalMs: 100 },
    })
    run(idler, 30_000)

    const left = eventsOfKind(drainEvents(idler), 'beeLeft')
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
  const roaming = { sipChance: 0, sipCapacity: 99, maxHops: 200, hopIntervalMs: 100 }

  it('only ever stands on a cell that exists', () => {
    const wanderer = makeGame({
      type: { ...roaming, intentWeights: { forage: 1, hunt: 1, wander: 1 } },
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
      type: roaming,
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

  it('roams rather than sitting on one cell', () => {
    const wanderer = makeGame({
      type: roaming,
      bees: { min: 1, max: 1, spawnIntervalMs: 60_000 },
    })

    const visited = new Set<string>()
    for (let elapsed = 0; elapsed < 20_000; elapsed += 16) {
      step(wanderer, 16)
      for (const bee of wanderer.state.bees) visited.add(key(bee.at))
    }
    expect(visited.size).toBeGreaterThan(5)
  })

  it('mostly avoids doubling straight back', () => {
    const wanderer = makeGame({
      type: { ...roaming, revisitAversion: 0.95 },
      bees: { min: 1, max: 1, spawnIntervalMs: 60_000 },
    })

    const trail: string[] = []
    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(wanderer, 16)
      for (const event of eventsOfKind(drainEvents(wanderer), 'beeMoved')) {
        trail.push(event.cellKey)
      }
    }

    let doubledBack = 0
    for (let i = 2; i < trail.length; i++) if (trail[i] === trail[i - 2]) doubledBack++

    expect(trail.length).toBeGreaterThan(20)
    expect(doubledBack / trail.length).toBeLessThan(0.35)
  })
})

describe('intent', () => {
  /**
   * A honey landscape: the middle of the board is full, the outside is nearly empty.
   * A forager should be drawn inward, a hunter outward — because empty cells are the
   * ones the player has been using.
   */
  function withLandscape(options: Options) {
    const roaming = { sipChance: 0, sipCapacity: 99, maxHops: 200, hopIntervalMs: 100 }
    const built = makeGame({
      ...options,
      type: { ...roaming, ...options.type },
      bees: { min: 1, max: 1, spawnIntervalMs: 60_000, ...options.bees },
    })
    for (const cell of built.state.cells.values()) {
      cell.honey = cell.ring <= 1 ? 100 : 1
    }
    return built
  }

  /** Average ring the bee occupies over a long roam. Lower means further in. */
  function averageRing(built: Game): number {
    let total = 0
    let samples = 0
    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(built, 16)
      for (const bee of built.state.bees) {
        if (!isOnBoard(bee)) continue
        total += ring(bee.at)
        samples++
      }
    }
    return samples > 0 ? total / samples : Number.NaN
  }

  it('draws a forager towards the honey', () => {
    const forager = averageRing(
      withLandscape({ type: { intentWeights: { forage: 1, hunt: 0, wander: 0 } } }),
    )
    const hunter = averageRing(
      withLandscape({ type: { intentWeights: { forage: 0, hunt: 1, wander: 0 } } }),
    )

    expect(forager).toBeLessThan(hunter)
  })

  it('draws a hunter towards the cells the player has drained', () => {
    // Same landscape, opposite pull: an empty cell is a record of the player's habits.
    const hunter = averageRing(
      withLandscape({ type: { intentWeights: { forage: 0, hunt: 1, wander: 0 } } }),
    )
    expect(hunter).toBeGreaterThan(1)
  })

  it('keeps an inclination from becoming a rail', () => {
    // The floor is what stops a forager being unable to cross an empty cell.
    const built = withLandscape({
      type: { intentWeights: { forage: 1, hunt: 0, wander: 0 }, intentFloor: 0.15 },
    })

    const rings = new Set<number>()
    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(built, 16)
      for (const bee of built.state.bees) if (isOnBoard(bee)) rings.add(ring(bee.at))
    }
    expect(rings.size).toBeGreaterThan(1)
  })

  it('holds its intent when told never to shift', () => {
    const built = withLandscape({ type: { intentShiftChance: 0 } })
    run(built, 2200)
    const first = built.state.bees[0]!.intent
    run(built, 20_000)
    for (const bee of built.state.bees) expect(bee.intent).toBe(first)
  })

  it('changes its mind when told it may', () => {
    const built = withLandscape({
      type: {
        intentShiftChance: 1,
        intentWeights: { forage: 1, hunt: 1, wander: 1 },
      },
    })

    const seen = new Set<string>()
    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(built, 16)
      for (const bee of built.state.bees) seen.add(bee.intent)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('falls back to wandering when a level gives every intent zero weight', () => {
    const built = withLandscape({
      type: { intentWeights: { forage: 0, hunt: 0, wander: 0 } },
    })
    run(built, 2200)
    expect(built.state.bees[0]!.intent).toBe('wander')
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
