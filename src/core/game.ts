import { buildAdjacency, createHoneycomb } from './honeycomb'
import { bonusMsFor, harvestFor, levelIndexFor } from './scoring'
import { judgeTrail, lettersIn, stepTrail } from './trail'
import { isOnBoard, stepBees } from './bees'
import { applySting, endIfOutOfTime } from './damage'
import { takeHoney } from './reseed'
import { key } from './hex'
import type { Game, GameDeps, GameState, Level } from './types'

export type { Game, GameDeps } from './types'

/**
 * The game loop, as pure rules.
 *
 * Nothing here touches a canvas, the DOM, React, or a clock. Time arrives as a delta
 * and randomness as an injected generator, so a whole game replays exactly from its
 * seed — which is the only practical way to reproduce a board someone reports.
 * See docs/adr/0002-layered-architecture.md.
 */

export function createGame(deps: GameDeps, seed: number): Game {
  const { config } = deps
  const cells = createHoneycomb(config.board.rings, config.honey.cellCapacity)
  deps.generator.seedHoneycomb(cells, deps.rng)

  const state: GameState = {
    seed,
    screen: 'playing',
    cells,
    trail: [],
    dragVoided: false,
    bees: [],
    pot: 0,
    clockMs: config.clock.durationMs,
    levelIndex: 0,
    played: new Set<string>(),
    found: [],
    msSinceSpawn: 0,
    waveElapsedMs: 0,
    inWave: true,
    elapsedMs: 0,
    nextBeeId: 1,
    events: [],
  }

  return { state, adjacency: buildAdjacency(cells), deps }
}

export function currentLevel(game: Game): Level {
  const { levels } = game.deps
  return levels[Math.min(game.state.levelIndex, levels.length - 1)]!
}

function beeOn(game: Game, cellKey: string): number | null {
  for (const bee of game.state.bees) {
    if (!isOnBoard(bee)) continue
    if (key(bee.at) === cellKey) return bee.id
  }
  return null
}

export function beginTrail(game: Game, cellKey: string): void {
  const { state } = game
  if (state.screen !== 'playing') return
  if (!state.cells.has(cellKey)) return

  state.dragVoided = false

  const beeId = beeOn(game, cellKey)
  if (beeId !== null) {
    applySting(game, cellKey, beeId)
    return
  }

  state.trail = [cellKey]
  state.events.push({ kind: 'trailStarted', cellKey })
}

export function moveTrail(game: Game, cellKey: string): void {
  const { state } = game
  if (state.screen !== 'playing') return
  // The pointer is still down after a sting; ignore it until the player lifts.
  if (state.dragVoided) return
  if (state.trail.length === 0) return
  if (!state.cells.has(cellKey)) return

  const { trail, effect } = stepTrail(state.trail, cellKey, game.adjacency)
  if (effect === 'ignored') return

  if (effect === 'extended') {
    const beeId = beeOn(game, cellKey)
    if (beeId !== null) {
      applySting(game, cellKey, beeId)
      return
    }
  }

  state.trail = trail
  state.events.push(
    effect === 'backtracked'
      ? { kind: 'trailBacktracked', cellKey }
      : { kind: 'trailExtended', cellKey },
  )
}

export function releaseTrail(game: Game): void {
  const { state, deps } = game

  if (state.dragVoided) {
    state.dragVoided = false
    return
  }
  if (state.screen !== 'playing' || state.trail.length === 0) return

  const trail = state.trail
  state.trail = []

  const level = currentLevel(game)
  const verdict = judgeTrail(
    trail,
    state.cells,
    deps.dictionary,
    deps.config.words.minLetters,
    state.played,
  )

  if (verdict.kind === 'rejected') {
    state.events.push({
      kind: 'wordRejected',
      reason: verdict.reason,
      word: verdict.word,
      cellKeys: trail,
    })
    return
  }

  const wordLength = lettersIn(trail, state.cells)
  const letters = trail.map((cellKey) => state.cells.get(cellKey)!.letter)
  const harvest = harvestFor(letters, wordLength, deps.config, level)

  state.played.add(verdict.word)
  state.found.push({ word: verdict.word, letters: wordLength, harvested: harvest.toPot })
  state.pot += harvest.toPot

  // The clock never rises above the duration the game started with, so a long word
  // played on a nearly full clock is partly wasted. The applied amount rather than
  // the earned amount goes on the event: presentation shows the player what really
  // happened, and does not have to know the cap rule to do it.
  const earned = bonusMsFor(wordLength, deps.config)
  const applied = Math.min(earned, deps.config.clock.durationMs - state.clockMs)
  state.clockMs += applied

  state.events.push({
    kind: 'wordScored',
    word: verdict.word,
    cellKeys: trail,
    harvested: harvest.toPot,
    bonusMs: applied,
  })

  trail.forEach((cellKey, index) => takeHoney(game, cellKey, harvest.perCell[index]!))

  applyLevel(game)
}

function applyLevel(game: Game): void {
  const { state, deps } = game
  const next = levelIndexFor(state.pot, deps.levels)
  if (next === state.levelIndex) return

  const from = state.levelIndex
  state.levelIndex = next
  state.events.push({ kind: 'levelChanged', from, to: next })
}

/**
 * Advance the simulation.
 *
 * Called at a fixed rate with a fixed delta, so behaviour does not vary with frame
 * rate and a replay from a seed lands in exactly the same place.
 */
export function step(game: Game, dtMs: number): void {
  const { state } = game
  if (state.screen !== 'playing') return

  state.elapsedMs += dtMs

  // A plain subtraction, so the clock is frame-rate independent by construction
  // rather than by careful integration. The health drain it replaced needed a
  // piecewise integral across its ease-in and got that wrong once.
  state.clockMs = Math.max(0, state.clockMs - dtMs)

  stepBees(game, currentLevel(game), dtMs)

  endIfOutOfTime(game)
}

/** Take the events produced since the last drain. */
export function drainEvents(game: Game) {
  const events = game.state.events
  game.state.events = []
  return events
}
