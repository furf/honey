import { DIRECTIONS, add, key, ring } from './hex'
import { takeHoney } from './reseed'
import type { Bee, BeeType, Game, Level } from './types'

/**
 * Bees: arrive, cross the honeycomb, sip, and leave.
 *
 * A bee holds a heading and mostly keeps it, so a visit reads as a flight across the
 * board rather than a wander around one corner. It leaves when it fills up or when
 * its heading takes it off the edge — so a bee is a passing hazard, not a resident.
 *
 * See docs/design/gameplay.md and docs/adr/0005-bee-behaviour-lives-on-bee-types.md.
 */

/** A bee type with the current level's overrides applied. */
export function beeTypeFor(game: Game, typeId: string, level: Level): BeeType {
  const base = game.deps.beeTypes[typeId]
  if (!base) throw new Error(`unknown bee type: ${typeId}`)
  return { ...base, ...level.bees.overrides }
}

/** A bee is only a hazard once it has landed and before it starts leaving. */
export function isOnBoard(bee: Bee): boolean {
  return bee.phase === 'hopping' || bee.phase === 'sipping'
}

function cellKeyOf(bee: Bee): string {
  return key(bee.at)
}

/**
 * Where a bee enters.
 *
 * Always an outer-ring cell, so bees visibly cross the board rather than materialising
 * in the middle of the player's route.
 */
function chooseEntry(game: Game): { at: { q: number; r: number }; heading: number } | null {
  const { state, deps } = game
  const rings = deps.config.board.rings

  const outer = [...state.cells.values()].filter((cell) => cell.ring === rings)
  if (outer.length === 0) return null

  const cell = deps.rng.pick(outer)

  // Head roughly inward, so the flight crosses the board instead of clipping a corner.
  let best = 0
  let bestRing = Infinity
  for (let direction = 0; direction < DIRECTIONS.length; direction++) {
    const ahead = add(cell.at, DIRECTIONS[direction]!)
    const distance = ring(ahead)
    if (distance < bestRing) {
      bestRing = distance
      best = direction
    }
  }

  return { at: cell.at, heading: best }
}

function spawn(game: Game, level: Level): void {
  const { state, deps } = game
  if (level.bees.types.length === 0) return

  const entry = chooseEntry(game)
  if (!entry) return

  const typeId = deps.rng.pick(level.bees.types)
  const type = beeTypeFor(game, typeId, level)

  state.bees.push({
    id: state.nextBeeId++,
    typeId,
    at: entry.at,
    heading: entry.heading,
    sipsTaken: 0,
    timerMs: type.arrivalMs,
    phase: 'arriving',
  })
}

/**
 * Choose the next cell, holding the heading where possible.
 *
 * Returns null when the bee's heading carries it off the board, which is how a flight
 * ends naturally at the far edge.
 */
function advance(game: Game, bee: Bee, type: BeeType): string | null {
  const { state, deps } = game

  let heading = bee.heading
  if (deps.rng.chance(type.turnChance)) {
    heading = (heading + (deps.rng.chance(0.5) ? 1 : 5)) % DIRECTIONS.length
  }

  const ahead = add(bee.at, DIRECTIONS[heading]!)
  const aheadKey = key(ahead)

  if (state.cells.has(aheadKey)) {
    bee.at = ahead
    bee.heading = heading
    return aheadKey
  }

  // Off the edge. The bee leaves rather than turning back — steering it onto the
  // board would have bees hugging the rim until they filled up, which reads as
  // loitering rather than the flight across the honeycomb the game asks for.
  return null
}

/** Decide what a bee does now that it is standing on a cell. */
function settle(game: Game, bee: Bee, type: BeeType): void {
  if (game.deps.rng.chance(type.sipChance)) {
    bee.phase = 'sipping'
    bee.timerMs = type.sipDurationMs
  } else {
    // A bee that does not sip still blocks its cell, which costs the player routing
    // options rather than honey. That is why sipChance falls in later levels.
    bee.phase = 'hopping'
    bee.timerMs = type.hopIntervalMs
  }
}

function depart(bee: Bee, type: BeeType): void {
  bee.phase = 'leaving'
  bee.timerMs = type.departureMs
}

function sip(game: Game, bee: Bee, type: BeeType): void {
  const { state, deps } = game
  const cellKey = cellKeyOf(bee)
  const amount = deps.config.honey.cellCapacity * type.sipPercent

  // Honey a bee takes is gone: it does not return to the board or reach the pot.
  const taken = takeHoney(game, cellKey, amount)
  bee.sipsTaken++

  state.events.push({
    kind: 'beeSipped',
    beeId: bee.id,
    cellKey,
    taken,
    sipsLeft: Math.max(0, type.sipCapacity - bee.sipsTaken),
  })

  if (bee.sipsTaken >= type.sipCapacity) {
    depart(bee, type)
  } else {
    bee.phase = 'hopping'
    bee.timerMs = type.hopIntervalMs
  }
}

/** Advance one bee, returning false when it has left the board. */
function stepBee(game: Game, bee: Bee, level: Level, dtMs: number): boolean {
  const { state } = game
  const type = beeTypeFor(game, bee.typeId, level)

  bee.timerMs -= dtMs
  if (bee.timerMs > 0) return true

  switch (bee.phase) {
    case 'arriving': {
      state.events.push({ kind: 'beeArrived', beeId: bee.id, cellKey: cellKeyOf(bee) })
      settle(game, bee, type)
      return true
    }

    case 'sipping': {
      sip(game, bee, type)
      return true
    }

    case 'hopping': {
      const moved = advance(game, bee, type)
      if (moved === null) {
        depart(bee, type)
        return true
      }
      state.events.push({ kind: 'beeMoved', beeId: bee.id, cellKey: moved })
      settle(game, bee, type)
      return true
    }

    case 'leaving': {
      state.events.push({
        kind: 'beeLeft',
        beeId: bee.id,
        full: bee.sipsTaken >= type.sipCapacity,
      })
      return false
    }
  }
}

/**
 * Advance every bee, then top the population back up.
 *
 * A leaving bee still occupies its cell and can still sting, so it counts against the
 * maximum. It does not count towards the minimum, because a level that insists on a
 * bee being present should not be satisfied by one on its way out.
 */
export function stepBees(game: Game, level: Level, dtMs: number): void {
  const { state } = game

  state.bees = state.bees.filter((bee) => stepBee(game, bee, level, dtMs))

  state.msSinceSpawn += dtMs

  const present = state.bees.length
  const staying = state.bees.filter((bee) => bee.phase !== 'leaving').length

  if (staying < level.bees.min && present < level.bees.max) {
    spawn(game, level)
    state.msSinceSpawn = 0
    return
  }

  if (present < level.bees.max && state.msSinceSpawn >= level.bees.spawnIntervalMs) {
    spawn(game, level)
    state.msSinceSpawn = 0
  }
}
