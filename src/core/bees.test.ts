import { beforeEach, describe, expect, it } from 'vitest'
import { isOnBoard } from './bees'
import { beginTrail, createGame, drainEvents, moveTrail, step } from './game'
import { key, ring } from './hex'
import { createRng } from './rng'
import { stubDictionary, stubGenerator, testBeeType, testConfig, testLevel } from './testSupport'
import type { BeeType, Game, GameDeps, GameEvent, Level, LevelBees } from './types'

interface Options {
  bees?: Partial<LevelBees>
  forager?: Partial<BeeType>
  hunter?: Partial<BeeType>
  seed?: number
}

function makeGame(options: Options = {}): Game {
  const level: Level = testLevel({
    bees: {
      types: ['forager'],
      max: 1,
      spawnIntervalMs: 1000,
      // No calm unless a test asks for one, so most tests see a steady supply.
      waveMs: 0,
      calmMs: 0,
      speed: 1,
      ...options.bees,
    },
  })

  const deps: GameDeps = {
    config: testConfig,
    levels: [level],
    dictionary: stubDictionary(['TEAM']),
    generator: stubGenerator(['Z'], ['Y']),
    beeTypes: {
      forager: testBeeType({ id: 'forager', intent: 'forage', ...options.forager }),
      hunter: testBeeType({
        id: 'hunter',
        intent: 'hunt',
        spriteId: 'bee.hunter',
        ...options.hunter,
      }),
    },
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
    const quiet = makeGame({ bees: { types: [], max: 0 } })
    run(quiet, 60_000)
    expect(quiet.state.bees).toEqual([])
  })

  it('spawns once the interval has passed', () => {
    expect(game.state.bees).toHaveLength(0)
    run(game, 1100)
    expect(game.state.bees).toHaveLength(1)
  })

  it('never exceeds the maximum', () => {
    const busy = makeGame({ bees: { types: ['forager', 'hunter'], max: 2, spawnIntervalMs: 200 } })
    for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
      step(busy, 16)
      expect(busy.state.bees.length).toBeLessThanOrEqual(2)
    }
  })

  it('enters on the outer ring, so a bee is never conjured mid-board', () => {
    run(game, 1100)
    expect(ring(game.state.bees[0]!.at)).toBe(testConfig.board.rings)
  })

  it('announces the kind on approach, before it can be seen clearly', () => {
    run(game, 1100)
    const approaching = eventsOfKind(drainEvents(game), 'beeApproaching')
    expect(approaching).toHaveLength(1)
    expect(approaching[0]!.typeId).toBe('forager')
  })
})

describe('one of each kind', () => {
  it('never fields two bees of the same kind', () => {
    // Two foragers are indistinguishable from one another and read as a swarm.
    const busy = makeGame({ bees: { types: ['forager', 'hunter'], max: 2, spawnIntervalMs: 300 } })

    for (let elapsed = 0; elapsed < 90_000; elapsed += 16) {
      step(busy, 16)
      const kinds = busy.state.bees.map((bee) => bee.typeId)
      expect(new Set(kinds).size).toBe(kinds.length)
    }
  })

  it('fields both kinds when the level allows two', () => {
    const busy = makeGame({
      bees: { types: ['forager', 'hunter'], max: 2, spawnIntervalMs: 300 },
      forager: { maxHops: 200, sipCapacity: 99 },
      hunter: { maxHops: 200, sipCapacity: 99 },
    })

    let sawBoth = false
    for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
      step(busy, 16)
      if (new Set(busy.state.bees.map((bee) => bee.typeId)).size === 2) sawBoth = true
    }
    expect(sawBoth).toBe(true)
  })
})

describe('waves', () => {
  it('stops spawning during a calm', () => {
    const waves = makeGame({
      bees: { waveMs: 4000, calmMs: 20_000, spawnIntervalMs: 500, max: 1 },
      forager: { sipCapacity: 1, maxHops: 2, hopIntervalMs: 200 },
    })

    // Run past the wave and well into the calm, then check the board clears.
    run(waves, 40_000)
    expect(waves.state.inWave).toBe(false)
    expect(waves.state.bees).toEqual([])
  })

  it('lets the board actually empty between waves', () => {
    // A threat that is always present stops being a threat.
    const waves = makeGame({
      bees: { waveMs: 5000, calmMs: 12_000, spawnIntervalMs: 500, max: 1 },
      forager: { sipCapacity: 1, maxHops: 3, hopIntervalMs: 200 },
    })

    let sawEmpty = false
    let sawBees = false
    for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
      step(waves, 16)
      if (waves.state.bees.length === 0) sawEmpty = true
      if (waves.state.bees.length > 0) sawBees = true
    }
    expect(sawBees).toBe(true)
    expect(sawEmpty).toBe(true)
  })

  it('does not start a new wave while stragglers remain', () => {
    const waves = makeGame({
      bees: { waveMs: 2000, calmMs: 1000, spawnIntervalMs: 400, max: 1 },
      // Never fills up and roams a long time, so it outlasts the calm.
      forager: { sipChance: 0, sipCapacity: 99, maxHops: 500, hopIntervalMs: 400 },
    })

    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(waves, 16)
      if (!waves.state.inWave && waves.state.waveElapsedMs > 1000) {
        // The calm is over by the clock, so a lingering bee is the only thing
        // holding the next wave back.
        expect(waves.state.bees.length).toBeGreaterThan(0)
      }
    }
  })

  it('treats a level with no wave configured as always open', () => {
    run(game, 1100)
    expect(game.state.inWave).toBe(true)
    expect(game.state.bees).toHaveLength(1)
  })
})

describe('arriving', () => {
  it('cannot sting while still approaching', () => {
    run(game, 900)
    const bee = game.state.bees[0]
    if (bee) expect(isOnBoard(bee)).toBe(false)
  })

  it('lands after its arrival time and says which kind it is', () => {
    run(game, 1100)
    drainEvents(game)
    run(game, 1400)

    const arrived = eventsOfKind(drainEvents(game), 'beeArrived')
    expect(arrived).toHaveLength(1)
    expect(arrived[0]!.typeId).toBe('forager')
    expect(isOnBoard(game.state.bees[0]!)).toBe(true)
  })
})

describe('turning before travelling', () => {
  it('turns on the spot before each move', () => {
    const turner = makeGame({ forager: { turnMs: 400, hopIntervalMs: 400, sipChance: 0 } })

    let sawTurning = false
    let turnedBeforeMoving = false
    let wasTurning = false

    for (let elapsed = 0; elapsed < 20_000; elapsed += 16) {
      step(turner, 16)
      const bee = turner.state.bees[0]
      if (!bee) continue

      if (bee.phase === 'turning') {
        sawTurning = true
        wasTurning = true
        // It commits to a destination before it starts moving, which is what makes
        // the next move readable rather than a surprise.
        expect(bee.turningTo).not.toBeNull()
      }
      if (eventsOfKind(drainEvents(turner), 'beeMoved').length > 0 && wasTurning) {
        turnedBeforeMoving = true
        wasTurning = false
      }
    }

    expect(sawTurning).toBe(true)
    expect(turnedBeforeMoving).toBe(true)
  })

  it('can still sting while turning', () => {
    // It is standing on a cell, so it must remain a hazard.
    const turner = makeGame({ forager: { turnMs: 600, hopIntervalMs: 400, sipChance: 0 } })

    let stingableWhileTurning = false
    for (let elapsed = 0; elapsed < 20_000; elapsed += 16) {
      step(turner, 16)
      const bee = turner.state.bees[0]
      if (bee?.phase === 'turning' && isOnBoard(bee)) stingableWhileTurning = true
    }
    expect(stingableWhileTurning).toBe(true)
  })
})

describe('speed', () => {
  it('makes bees quicker when the level says so', () => {
    const countMoves = (speed: number) => {
      const built = makeGame({
        bees: { speed, spawnIntervalMs: 500, max: 1 },
        forager: { sipChance: 0, sipCapacity: 99, maxHops: 500, hopIntervalMs: 800, turnMs: 200 },
      })
      let moves = 0
      for (let elapsed = 0; elapsed < 30_000; elapsed += 16) {
        step(built, 16)
        moves += eventsOfKind(drainEvents(built), 'beeMoved').length
      }
      return moves
    }

    expect(countMoves(2)).toBeGreaterThan(countMoves(1))
  })
})

describe('sipping', () => {
  it('takes a share of capacity from the cell it rests on', () => {
    run(game, 2600)
    const bee = game.state.bees[0]!
    const cellKey = key(bee.at)

    run(game, 1400)
    const sips = eventsOfKind(drainEvents(game), 'beeSipped')

    expect(sips.length).toBeGreaterThanOrEqual(1)
    expect(game.state.cells.get(cellKey)!.honey).toBeLessThan(100)
  })

  it('gives the player nothing — honey a bee takes is gone', () => {
    run(game, 20_000)
    expect(game.state.pot).toBe(0)
  })

  it('never sips when its chance is zero', () => {
    const shy = makeGame({ forager: { sipChance: 0 } })
    run(shy, 20_000)
    expect(eventsOfKind(drainEvents(shy), 'beeSipped')).toEqual([])
  })

  it('reseeds a cell it drains to empty', () => {
    const thirsty = makeGame({ forager: { sipPercent: 1 } })
    run(thirsty, 20_000)
    expect(eventsOfKind(drainEvents(thirsty), 'cellReseeded').length).toBeGreaterThan(0)
  })
})

describe('leaving', () => {
  it('leaves once it has filled up, and says so', () => {
    const greedy = makeGame({ forager: { sipCapacity: 2 } })
    run(greedy, 40_000)

    const left = eventsOfKind(drainEvents(greedy), 'beeLeft')
    expect(left.length).toBeGreaterThanOrEqual(1)
    expect(left[0]!.full).toBe(true)
  })

  it('gives up after its maximum hops, however little it collected', () => {
    const idler = makeGame({
      forager: { sipChance: 0, sipCapacity: 99, maxHops: 4, hopIntervalMs: 150, turnMs: 50 },
    })
    run(idler, 40_000)

    const left = eventsOfKind(drainEvents(idler), 'beeLeft')
    expect(left.length).toBeGreaterThanOrEqual(1)
    expect(left.every((event) => event.full)).toBe(false)
  })

  it('makes for the rim once done, rather than vanishing where it stood', () => {
    const greedy = makeGame({
      forager: { sipCapacity: 1, sipChance: 1, hopIntervalMs: 150, turnMs: 50 },
    })

    // Follow one bee by id. Bees come and go over a run this long, so watching
    // whichever happens to be first tracks several different insects.
    let tracked: number | null = null
    const rings: number[] = []

    for (let elapsed = 0; elapsed < 30_000; elapsed += 16) {
      step(greedy, 16)
      tracked ??= greedy.state.bees[0]?.id ?? null
      if (tracked === null) continue

      const bee = greedy.state.bees.find((candidate) => candidate.id === tracked)
      if (!bee) break
      if (bee.exiting) rings.push(ring(bee.at))
    }

    expect(rings.length).toBeGreaterThan(0)
    for (let i = 1; i < rings.length; i++) expect(rings[i]).toBeGreaterThanOrEqual(rings[i - 1]!)
    expect(rings.at(-1)).toBe(testConfig.board.rings)
  })

  it('takes no more honey on the way out', () => {
    const greedy = makeGame({
      forager: { sipCapacity: 1, sipChance: 1, hopIntervalMs: 150, turnMs: 50 },
    })

    const exiting = new Set<number>()
    let sipsAfterExit = 0

    for (let elapsed = 0; elapsed < 30_000; elapsed += 16) {
      for (const bee of greedy.state.bees) if (bee.exiting) exiting.add(bee.id)
      step(greedy, 16)
      for (const event of eventsOfKind(drainEvents(greedy), 'beeSipped')) {
        if (exiting.has(event.beeId)) sipsAfterExit++
      }
    }

    expect(sipsAfterExit).toBe(0)
  })
})

describe('movement', () => {
  const roaming = { sipChance: 0, sipCapacity: 99, maxHops: 200, hopIntervalMs: 150, turnMs: 50 }

  it('only ever stands on a cell that exists', () => {
    const wanderer = makeGame({ forager: roaming })
    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(wanderer, 16)
      for (const bee of wanderer.state.bees) {
        expect(wanderer.state.cells.has(key(bee.at))).toBe(true)
      }
    }
  })

  it('moves to a neighbouring cell, never a distant one', () => {
    const wanderer = makeGame({ forager: roaming })
    const previous = new Map<number, string>()

    for (let elapsed = 0; elapsed < 30_000; elapsed += 16) {
      step(wanderer, 16)
      for (const bee of wanderer.state.bees) {
        const at = key(bee.at)
        const before = previous.get(bee.id)
        if (before && before !== at) expect(wanderer.adjacency.get(before)).toContain(at)
        previous.set(bee.id, at)
      }
    }
  })

  it('roams rather than sitting on one cell', () => {
    const wanderer = makeGame({ forager: roaming })
    const visited = new Set<string>()
    for (let elapsed = 0; elapsed < 20_000; elapsed += 16) {
      step(wanderer, 16)
      for (const bee of wanderer.state.bees) visited.add(key(bee.at))
    }
    expect(visited.size).toBeGreaterThan(4)
  })
})

describe('intent', () => {
  const roaming = { sipChance: 0, sipCapacity: 99, maxHops: 300, hopIntervalMs: 120, turnMs: 40 }

  /** A full centre and an empty rim: a forager should go in, a hunter out. */
  function withLandscape(typeId: 'forager' | 'hunter') {
    const built = makeGame({
      bees: { types: [typeId], max: 1, spawnIntervalMs: 400 },
      forager: roaming,
      hunter: roaming,
    })
    for (const cell of built.state.cells.values()) cell.honey = cell.ring === 0 ? 100 : 1
    return built
  }

  function averageRing(built: Game): number {
    let total = 0
    let samples = 0
    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(built, 16)
      for (const bee of built.state.bees) {
        if (!isOnBoard(bee)) continue
        // Keep the landscape fixed; sips would erase what we are measuring.
        total += ring(bee.at)
        samples++
      }
    }
    return samples > 0 ? total / samples : Number.NaN
  }

  it('pulls a forager towards honey and a hunter away from it', () => {
    // A hunter goes where the honey is not, because that is where the player has been.
    expect(averageRing(withLandscape('forager'))).toBeLessThan(
      averageRing(withLandscape('hunter')),
    )
  })

  it('keeps an inclination from becoming a rail', () => {
    const built = withLandscape('forager')
    const rings = new Set<number>()
    for (let elapsed = 0; elapsed < 40_000; elapsed += 16) {
      step(built, 16)
      for (const bee of built.state.bees) if (isOnBoard(bee)) rings.add(ring(bee.at))
    }
    expect(rings.size).toBeGreaterThan(1)
  })
})

describe('stinging a held trail', () => {
  const CENTRE = key({ q: 0, r: 0 })

  /** Start a two-cell trail, then park a bee one hop from its end, aimed at it. */
  function trailAndBee() {
    const built = makeGame()
    const near = built.adjacency.get(CENTRE)![0]!

    beginTrail(built, CENTRE)
    moveTrail(built, near)

    const from = built.adjacency
      .get(near)!
      .find((cellKey) => cellKey !== CENTRE && !built.state.trail.includes(cellKey))!

    built.state.bees.push({
      id: 99,
      typeId: 'forager',
      at: built.state.cells.get(from)!.at,
      cameFrom: null,
      turningTo: near,
      exiting: false,
      hops: 0,
      sipsTaken: 0,
      timerMs: 0,
      phase: 'turning',
    })

    return { game: built, near }
  }

  it('stings when a bee lands on a cell the player is holding', () => {
    // The hazard runs both ways: swiping into a bee and a bee flying onto the trail
    // are the same event from opposite directions.
    const { game: built, near } = trailAndBee()
    const clockMs = built.state.clockMs

    step(built, 16)

    const stung = eventsOfKind(drainEvents(built), 'stung')
    expect(stung).toHaveLength(1)
    expect(stung[0]!.cellKey).toBe(near)
    expect(built.state.clockMs).toBeLessThan(clockMs)
  })

  it('voids the whole trail, and reports every cell that was in it', () => {
    const { game: built, near } = trailAndBee()

    step(built, 16)

    expect(built.state.trail).toEqual([])
    expect(eventsOfKind(drainEvents(built), 'stung')[0]!.cellKeys).toEqual([CENTRE, near])
  })

  it('ignores the rest of the drag until the player lifts', () => {
    const { game: built } = trailAndBee()
    step(built, 16)
    drainEvents(built)

    moveTrail(built, built.adjacency.get(CENTRE)![1]!)
    expect(built.state.trail).toEqual([])
  })

  it('leaves an empty trail alone', () => {
    const built = makeGame()
    const target = built.adjacency.get(CENTRE)![0]!

    built.state.bees.push({
      id: 98,
      typeId: 'forager',
      at: built.state.cells.get(CENTRE)!.at,
      cameFrom: null,
      turningTo: target,
      exiting: false,
      hops: 0,
      sipsTaken: 0,
      timerMs: 0,
      phase: 'turning',
    })

    const clockMs = built.state.clockMs
    step(built, 16)

    // The only time that may go is the step itself. A sting would cost seconds.
    expect(eventsOfKind(drainEvents(built), 'stung')).toEqual([])
    expect(built.state.clockMs).toBe(clockMs - 16)
  })
})

describe('determinism', () => {
  it('replays identically from the same seed', () => {
    const snapshot = () => {
      const fresh = makeGame({ bees: { types: ['forager', 'hunter'], max: 2, spawnIntervalMs: 800 } })
      run(fresh, 30_000)
      return {
        bees: fresh.state.bees.map((bee) => ({ ...bee, at: { ...bee.at } })),
        honey: [...fresh.state.cells.values()].map((cell) => cell.honey),
      }
    }
    expect(snapshot()).toEqual(snapshot())
  })
})
