import { key, ring } from './hex'
import { applySting } from './damage'
import { takeHoney } from './reseed'
import type { Bee, BeeIntent, BeeType, Game, Level } from './types'

/**
 * Bees: arrive in waves, roam with a purpose, sip, and leave.
 *
 * A bee's purpose comes from its type. A forager drifts towards untouched honey; a
 * hunter drifts towards drained cells, because a cell's honey level is a record of how
 * the player has been playing and the cells they keep using are the empty ones. The
 * two read the same information and pull in opposite directions.
 *
 * Bees do not come continuously. Each level alternates a wave, during which they may
 * arrive, with a calm, during which none do — a threat that is always present stops
 * being a threat.
 *
 * See docs/design/gameplay.md and docs/adr/0005-bee-behaviour-lives-on-bee-types.md.
 */

/** A bee type with the level's overrides and speed applied. */
export function beeTypeFor(game: Game, typeId: string, level: Level): BeeType {
  const base = game.deps.beeTypes[typeId]
  if (!base) throw new Error(`unknown bee type: ${typeId}`)

  const merged = { ...base, ...level.bees.overrides }
  const speed = level.bees.speed > 0 ? level.bees.speed : 1
  if (speed === 1) return merged

  // Speed scales the clock rather than each interval, so a level quickens bees without
  // restating every timing it did not want to change.
  return {
    ...merged,
    hopIntervalMs: merged.hopIntervalMs / speed,
    sipDurationMs: merged.sipDurationMs / speed,
    turnMs: merged.turnMs / speed,
    arrivalMs: merged.arrivalMs / speed,
    departureMs: merged.departureMs / speed,
  }
}

/** A bee is only a hazard once it has landed and before it starts leaving. */
export function isOnBoard(bee: Bee): boolean {
  return bee.phase === 'hopping' || bee.phase === 'turning' || bee.phase === 'sipping'
}

function cellKeyOf(bee: Bee): string {
  return key(bee.at)
}

/**
 * How appealing a cell is to this intent, before the floor is added.
 *
 * Honey is a fraction of capacity so the scale holds whatever capacity is configured.
 */
function appetite(intent: BeeIntent, fill: number): number {
  switch (intent) {
    case 'forage':
      return fill
    case 'hunt':
      return 1 - fill
  }
}

/** Where a bee enters: always the outer ring, so it arrives from outside the board. */
function chooseEntry(game: Game) {
  const outer = [...game.state.cells.values()].filter(
    (cell) => cell.ring === game.deps.config.board.rings,
  )
  return outer.length > 0 ? game.deps.rng.pick(outer) : null
}

/**
 * Which kind to send next.
 *
 * At most one of each type is ever present, so two bees are always one of each rather
 * than a pair of the same — which is both fairer and legible.
 */
function chooseType(game: Game, level: Level): string | null {
  const present = new Set(game.state.bees.map((bee) => bee.typeId))
  const available = level.bees.types.filter((typeId) => !present.has(typeId))
  return available.length > 0 ? game.deps.rng.pick(available) : null
}

function spawn(game: Game, level: Level): void {
  const { state } = game

  const typeId = chooseType(game, level)
  if (typeId === null) return

  const entry = chooseEntry(game)
  if (!entry) return

  const type = beeTypeFor(game, typeId, level)

  state.bees.push({
    id: state.nextBeeId++,
    typeId,
    at: entry.at,
    cameFrom: null,
    turningTo: null,
    exiting: false,
    hops: 0,
    sipsTaken: 0,
    timerMs: type.arrivalMs,
    phase: 'arriving',
  })

  state.events.push({
    kind: 'beeApproaching',
    beeId: state.nextBeeId - 1,
    typeId,
    approachSound: type.approachSound,
    cellKey: key(entry.at),
    durationMs: type.arrivalMs,
  })
}

/**
 * Pick the next cell, weighted by the type's intent.
 *
 * Every neighbour keeps at least `intentFloor` of weight, so an inclination never
 * becomes a rail — a forager can still cross an empty cell.
 */
function chooseNext(game: Game, bee: Bee, type: BeeType): string | null {
  const { state, deps } = game
  const capacity = deps.config.honey.cellCapacity
  const neighbours = game.adjacency.get(cellKeyOf(bee))
  if (!neighbours || neighbours.length === 0) return null

  const weighted = neighbours.map((neighbourKey) => {
    const cell = state.cells.get(neighbourKey)!
    const fill = capacity > 0 ? Math.max(0, Math.min(1, cell.honey / capacity)) : 0

    let weight = appetite(type.intent, fill) + type.intentFloor
    // Doubling straight back reads as indecision rather than erratic movement.
    if (neighbourKey === bee.cameFrom) weight *= 1 - type.revisitAversion

    return [neighbourKey, Math.max(0, weight)] as const
  })

  const total = weighted.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0) return deps.rng.pick(neighbours)

  return deps.rng.weighted(weighted)
}

function settle(game: Game, bee: Bee, type: BeeType): void {
  // A bee on its way out is full, and has no reason to stop.
  if (!bee.exiting && game.deps.rng.chance(type.sipChance)) {
    bee.phase = 'sipping'
    bee.timerMs = type.sipDurationMs
    return
  }

  // A bee that does not sip still blocks its cell, which costs the player routing
  // options rather than honey.
  bee.phase = 'hopping'
  bee.timerMs = type.hopIntervalMs
}

function beginExit(bee: Bee): void {
  bee.exiting = true
}

function leave(bee: Bee, type: BeeType): void {
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

  if (bee.sipsTaken >= type.sipCapacity) beginExit(bee)

  bee.phase = 'hopping'
  bee.timerMs = type.hopIntervalMs
}

/**
 * The next cell on the way out.
 *
 * Any neighbour on a higher ring is one hop closer to the edge, so a greedy step
 * outward is already the shortest route — no search needed for a board this shape.
 */
function exitTarget(game: Game, bee: Bee): string | null {
  const { state, deps } = game
  const here = state.cells.get(cellKeyOf(bee))!
  if (here.ring >= deps.config.board.rings) return null

  const outward = (game.adjacency.get(cellKeyOf(bee)) ?? []).filter((neighbourKey) => {
    const cell = state.cells.get(neighbourKey)
    return cell !== undefined && cell.ring > here.ring
  })

  return outward.length > 0 ? deps.rng.pick(outward) : null
}

/**
 * Choose a destination and turn towards it.
 *
 * The turn is a phase of its own rather than something that happens during travel, so
 * a bee visibly commits to a direction before it moves — which is what makes its next
 * move readable instead of a surprise.
 */
function aim(game: Game, bee: Bee, type: BeeType): void {
  if (!bee.exiting && bee.hops >= type.maxHops) beginExit(bee)

  const next = bee.exiting ? exitTarget(game, bee) : chooseNext(game, bee, type)

  if (next === null) {
    if (bee.exiting) {
      leave(bee, type)
    } else {
      beginExit(bee)
      bee.phase = 'hopping'
      bee.timerMs = type.hopIntervalMs
    }
    return
  }

  bee.turningTo = next
  bee.phase = 'turning'
  bee.timerMs = type.turnMs

  game.state.events.push({
    kind: 'beeTurning',
    beeId: bee.id,
    cellKey: next,
    durationMs: type.turnMs,
  })
}

/**
 * A bee landing on a cell the player is holding stings them.
 *
 * The hazard runs both ways: swiping into a bee and a bee flying onto your trail are
 * the same event from opposite directions, and it would be arbitrary for only one to
 * cost anything.
 */
function stingIfOnTrail(game: Game, bee: Bee, cellKey: string): boolean {
  if (!game.state.trail.includes(cellKey)) return false
  applySting(game, cellKey, bee.id)
  return true
}

/** Complete the move the bee has already turned towards. */
function travel(game: Game, bee: Bee, type: BeeType): void {
  const { state } = game
  const next = bee.turningTo

  if (next === null || !state.cells.has(next)) {
    settle(game, bee, type)
    return
  }

  bee.cameFrom = cellKeyOf(bee)
  bee.at = state.cells.get(next)!.at
  bee.turningTo = null
  bee.hops++

  state.events.push({ kind: 'beeMoved', beeId: bee.id, cellKey: next })
  stingIfOnTrail(game, bee, next)
  settle(game, bee, type)
}

/** Advance one bee, returning false when it has left the board. */
function stepBee(game: Game, bee: Bee, level: Level, dtMs: number): boolean {
  const { state } = game
  const type = beeTypeFor(game, bee.typeId, level)

  bee.timerMs -= dtMs
  if (bee.timerMs > 0) return true

  switch (bee.phase) {
    case 'arriving':
      state.events.push({
        kind: 'beeArrived',
        beeId: bee.id,
        cellKey: cellKeyOf(bee),
        typeId: bee.typeId,
      })
      stingIfOnTrail(game, bee, cellKeyOf(bee))
      settle(game, bee, type)
      return true

    case 'sipping':
      sip(game, bee, type)
      return true

    case 'hopping':
      aim(game, bee, type)
      return true

    case 'turning':
      travel(game, bee, type)
      return true

    case 'leaving':
      state.events.push({
        kind: 'beeLeft',
        beeId: bee.id,
        full: bee.sipsTaken >= type.sipCapacity,
      })
      return false
  }
}

/**
 * Advance the wave clock.
 *
 * A calm ends only once the board is clear, so a wave never begins on top of stragglers
 * from the last one — the point of a calm is that the player gets a breather.
 */
function advanceWave(game: Game, level: Level, dtMs: number): void {
  const { state } = game
  const { waveMs, calmMs } = level.bees

  if (waveMs <= 0 && calmMs <= 0) {
    state.inWave = true
    return
  }

  state.waveElapsedMs += dtMs

  if (state.inWave) {
    if (state.waveElapsedMs >= waveMs) {
      state.inWave = false
      state.waveElapsedMs = 0
    }
    return
  }

  if (state.waveElapsedMs >= calmMs && state.bees.length === 0) {
    state.inWave = true
    state.waveElapsedMs = 0
  }
}

/**
 * Advance every bee, then top the population back up.
 *
 * Spawning happens only inside a wave. Bees already on the board finish their visit
 * during a calm rather than vanishing.
 */
export function stepBees(game: Game, level: Level, dtMs: number): void {
  const { state } = game

  state.bees = state.bees.filter((bee) => stepBee(game, bee, level, dtMs))

  advanceWave(game, level, dtMs)

  state.msSinceSpawn += dtMs
  if (!state.inWave) return
  if (state.bees.length >= level.bees.max) return
  if (state.msSinceSpawn < level.bees.spawnIntervalMs) return

  spawn(game, level)
  state.msSinceSpawn = 0
}

export { ring }
