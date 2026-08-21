# A countdown clock replaces health

## Status

accepted

Partially supersedes [ADR-0001](./0001-idle-decay-and-capacity-based-honey.md). The
honey half of that decision — capacity-based transfers, rarity-weighted harvests,
reseeding on depletion — stands unchanged. Its health half does not.

## Context

Health was a bar that drained at a rate the level set, was topped up and paused by
scoring a word, and was docked by stings. It worked, and it produced a game nobody
could read.

The problem is that health answers no question the player is actually asking. It is a
percentage of a maximum, moving at a speed that is invisible, so "how much longer do I
have?" has no answer on screen — only a bar that is shorter than it was. Worse, the
reward for a good word was split across two invisible quantities: some health back,
and a pause of some length before the drain resumed. A player who found an eight-letter
word could not tell you what it bought them, because the game never showed them.

Two symptoms followed. The drain rate became the only difficulty knob that mattered,
so every level's identity collapsed into "the bar goes down faster". And the drain
arithmetic itself was surprisingly delicate: because the rate eased in from zero after
each pause, advancing it correctly meant integrating a piecewise-linear rate across a
step that might straddle the clamp point. That was got wrong once, producing a game
that ran at different speeds on different frame rates.

## Decision

**Health is replaced by a clock: a visible countdown, in minutes and seconds.**

The clock starts at `config.clock.durationMs` and counts down in real time. A scored
word adds seconds by letter count (`config.clock.bonusSecondsByLength`). A sting costs
`config.clock.stingCostMs`. At zero, the game ends.

**The clock never rises above the duration the game started with.** That is one
configuration value, not a starting value plus a separate ceiling — the rule is that
the clock cannot exceed where it began, and two numbers obliged to stay equal would be
a trap rather than a flexibility.

**The bonus rises steeply with length** — one second, one, two, three, five, eight.
Fibonacci, because the shape matters more than the exact figures: a linear reward
makes the clock a function of how fast a player swipes, and a steep one makes it a
function of how hard they look. The shortest scoring words add nothing at all, which
keeps them available as a way out of a stuck board without making them a strategy.

**The clock ticks at one second per second, at every level.** A per-level scaling
factor was considered and rejected. A stopwatch that runs fast is lying to the player,
and the whole point of the change is that the number on screen means what it says.

**The amount of bonus actually applied travels on the word-scored event**, not the
amount the length earned. When the clock is nearly full a long word is partly wasted,
and presentation must be able to show the player what really happened without knowing
the cap rule.

## Considered Options

**Keeping health and adding a clock beside it** was rejected as two survival
quantities where the game needs one.

**A per-level clock rate** would have preserved the old drain knob. Rejected above.

**Levels advancing on elapsed time** rather than on the pot was considered, since a
countdown game makes it natural and it would guarantee the whole difficulty curve gets
seen. Rejected because it advances a player who is doing badly; the pot rewards skill,
which is the property worth keeping.

## Consequences

`level.healthDrainPerSecond`, `level.drainPauseMs`, `config.health.restoreByLength`,
`config.health.max` and `config.health.drainRampMs` are all deleted, along with the
module that held the drain arithmetic. A constant countdown is a subtraction inside the
simulation step and needs no module — and it is frame-rate independent by construction
rather than by careful integration, which removes a whole class of bug that this
codebase has already hit once.

Difficulty loses a knob and needs a replacement. That is why how fast cells give up
their honey becomes its own per-level setting, separate from what the pot is credited:
see [ADR-0001](./0001-idle-decay-and-capacity-based-honey.md) for the honey model those
two settings act on.

**The level thresholds are now scaled for a longer game than the clock produces.** They
were tuned when a game ran for several minutes. They have deliberately not been changed
here, so the first playtest measures the clock rather than the clock plus a rebalance,
but they are expected to need rescaling from measurement.

The cap creates a strategic layer worth watching: a bonus earned on a nearly full clock
is partly discarded, so there is an incentive to spend time down before banking a long
word. Whether players discover that is a question for playtesting.
