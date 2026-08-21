# The core loop: constant health drain and capacity-based honey

## Status

accepted; the health half is superseded by
[ADR-0008](./0008-a-countdown-clock-replaces-health.md)

**Amendment.** Everything below about *honey* still holds: capacity-based transfers,
rarity-weighted harvests, and reseeding on depletion are unchanged. Everything about
*health* has been replaced by a countdown clock, and the configuration named in it —
`level.healthDrainPerSecond`, `level.drainPauseMs`, `config.health.restoreByLength`,
`config.health.drainRampMs` — no longer exists. The reasoning is left intact rather
than rewritten, because ADR-0008 argues against it and an argument needs its opponent
on the record.

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
(`config.honey.cellCapacity`), never of its current level. A bee's sip takes
`beeType.sipPercent`. A harvest takes `level.harvestPercent` **scaled by the rarity of
the cell's letter**, so a `Z` pays more per word than an `E` and empties in fewer
words.

Capacity itself stays uniform. Rarity is expressed through one knob — the harvest
percentage — rather than two, so the honey meter still means the same thing on every
cell: how much is left, not how much it started with.

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

Depletion is linear, and the honey meter means exactly what it shows: how much is
left. It is no longer *countable* in words, because the same cell empties in a
different number of words depending on its letter. That is an accepted loss — players
report reading the meter as a rough sense of a letter's remaining life rather than
counting down from it.

Rare letters become self-correcting. A `J` or `X` pays well and clears itself off the
board quickly, instead of sitting in a corner as a cell the player routes around.

Bees accelerate reseeds, because their sips deplete cells toward the same empty
threshold a harvest does. This is deliberate: a bee both robs the player and refreshes
the board, so its presence is ambivalent rather than purely punishing.

Harvest and sip percentages are per-level, so the economy can be re-shaped across the
difficulty curve without touching rules code. They begin uniform across all levels.
