# The core loop: constant health drain and capacity-based honey

## Status

accepted

## Context

The original spec had two arithmetic holes that made the game unplayable as written.
Health was only lost by swiping into a bee — which is entirely avoidable — so the
game could never be lost and "game over" was unreachable. Separately, harvesting "a
percentage of the honey stored in each cell" meant taking a percentage of the cell's
*current* honey, which approaches zero asymptotically and never arrives, so cells
could never be exhausted and the reseed mechanic could never fire.

## Decision

**Health drains continuously at a constant rate** (`level.healthDrainPerSecond`),
rising with each level. Finding a word does two things: it restores health scaled by
word length (`config.health.restoreByLength`), and it **pauses** the drain for
`level.drainPauseMs`. When the pause expires, the drain eases in from zero to the
level's rate over `config.health.drainRampMs` — this ramp is animation polish, not a
difficulty mechanic, and is deliberately too short to be played around. Stings cost
`config.health.stingCost` and additionally void the trail.

**All honey transfers are a fixed percentage of a cell's capacity**
(`config.honey.cellCapacity`), never of its current level. A harvest takes
`level.harvestPercent`; a bee's sip takes `beeType.sipPercent`. Because both are
fractions of a constant capacity, the number of words a cell survives before reseeding
is fixed and countable.

## Considered Options

A global countdown timer was rejected: it makes every game end at roughly the same
wall-clock moment regardless of skill. Pausing and restoring the drain on every word
ties survival to productivity, which is the behaviour the game wants to reward.

Drain that *accelerates* with idleness was considered and rejected as a needless
second variable. A constant rate is the convention players already know from other
games, and a player cannot reason about a rate they cannot see changing.

A minimum-honey floor ("a cell below some threshold counts as empty") would also have
fixed the asymptote, but leaves depletion non-linear and the honey meter dishonest.

## Consequences

Depletion is linear and countable — a player can see how many words a cell has left
in it, and the honey meter means exactly what it shows.

Bees accelerate reseeds, because their sips deplete cells toward the same empty
threshold a harvest does. This is deliberate: a bee both robs the player and refreshes
the board, so its presence is ambivalent rather than purely punishing.

Harvest and sip percentages are per-level, so the economy can be re-shaped across the
difficulty curve without touching rules code. They begin uniform across all levels.
