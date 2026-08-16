import { key, ring } from './hex'
import { takeHoney } from './reseed'
import type { Bee, BeeIntent, BeeType, Game, Level } from './types'

/**
 * Bees: arrive, roam the honeycomb with a purpose, sip, and leave.
 *
 * Movement is erratic but not aimless. A bee holds an intent that biases which
 * neighbour it steps onto, and a cell's honey level is a record of how the player has
 * been playing — the cells they keep using are the empty ones. So a forager drifts
 * towards untouched honey while a hunter drifts towards the player's favourite
 * letters, looking for someone to sting.
 *
 * Levels override the intent weights, so a bee's disposition shifts across the
 * difficulty curve rather than being fixed for the whole game.
 *
 * See docs/design/gameplay.md and docs/adr/0005-bee-behaviour-lives-on-bee-types.md.
 */

const INTENTS: readonly BeeIntent[] = ['forage', 'hunt', 'wander']

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

function chooseIntent(game: Game, type: BeeType): BeeIntent {
  const weights = INTENTS.map((intent) => [intent, type.intentWeights[intent] ?? 0] as const)
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0) return 'wander'
  return game.deps.rng.weighted(weights)
}

/**
 * How appealing a cell is to a bee with this intent, before the floor is added.
 *
 * Honey is expressed as a fraction of capacity so the scale is the same whatever
 * capacity is configured.
 */
function appetite(intent: BeeIntent, fill: number): number {
  switch (intent) {
    case 'forage':
      return fill
    case 'hunt':
      return 1 - fill
    case 'wander':
      return 0.5
  }
}

/**
 * Where a bee enters.
 *
 * Always an outer-ring cell, so bees visibly arrive from outside rather than
 * materialising in the middle of the player's route.
 */
function chooseEntry(game: Game) {
  const outer = [...game.state.cells.values()].filter(
    (cell) => cell.ring === game.deps.config.board.rings,
  )
  return outer.length > 0 ? game.deps.rng.pick(outer) : null
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
    cameFrom: null,
    intent: chooseIntent(game, type),
    hops: 0,
    sipsTaken: 0,
    timerMs: type.arrivalMs,
    phase: 'arriving',
  })
}

/**
 * Pick the next cell, weighted by intent.
 *
 * Every neighbour keeps at least `intentFloor` of weight, so an inclination never
 * becomes a rail — a forager can still wander onto an empty cell, and the player can
 * never be certain where a bee will go.
 */
function chooseNext(game: Game, bee: Bee, type: BeeType): string | null {
  const { state, deps } = game
  const capacity = deps.config.honey.cellCapacity
  const here = cellKeyOf(bee)
  const neighbours = game.adjacency.get(here)
  if (!neighbours || neighbours.length === 0) return null

  const weighted = neighbours.map((neighbourKey) => {
    const cell = state.cells.get(neighbourKey)!
    const fill = capacity > 0 ? Math.max(0, Math.min(1, cell.honey / capacity)) : 0

    let weight = appetite(bee.intent, fill) + type.intentFloor
    // Doubling straight back reads as indecision rather than erratic movement.
    if (neighbourKey === bee.cameFrom) weight *= 1 - type.revisitAversion

    return [neighbourKey, Math.max(0, weight)] as const
  })

  const total = weighted.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0) return deps.rng.pick(neighbours)

  return deps.rng.weighted(weighted)
}

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

function hop(game: Game, bee: Bee, type: BeeType): void {
  const { state, deps } = game

  if (bee.hops >= type.maxHops) {
    depart(bee, type)
    return
  }

  if (deps.rng.chance(type.intentShiftChance)) bee.intent = chooseIntent(game, type)

  const next = chooseNext(game, bee, type)
  if (next === null) {
    depart(bee, type)
    return
  }

  const cell = state.cells.get(next)!
  bee.cameFrom = cellKeyOf(bee)
  bee.at = cell.at
  bee.hops++

  state.events.push({ kind: 'beeMoved', beeId: bee.id, cellKey: next })
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
      state.events.push({ kind: 'beeArrived', beeId: bee.id, cellKey: cellKeyOf(bee) })
      settle(game, bee, type)
      return true

    case 'sipping':
      sip(game, bee, type)
      return true

    case 'hopping':
      hop(game, bee, type)
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

/** Exposed for tests and tuning: the ring a coordinate sits on. */
export { ring }
