# Scoring

Everything a word is worth, and where each number comes from.

This is written to be read by someone who has never seen the code. It uses the terms
defined in [CONTEXT.md](../../CONTEXT.md) — Cell, Trail, Word, Harvest, Pot, Honey,
Clock, Bonus — and each of those means one specific thing.

Per the repository convention, this document names configuration variables rather than
quoting their values, so playtesting can change any number without making the
documentation wrong. The worked examples at the end are the exception: they state the
numbers they used, so you can follow the arithmetic.

## The two things a Word is worth

Finding a Word pays you in two separate currencies, and they are not interchangeable.

- **Honey** goes into the **Pot**. The Pot is your score, and it is what moves you
  through the Levels.
- **Seconds** go onto the **Clock**. The Clock is what keeps you alive.

A Word that pays a lot of Honey does not necessarily buy much time, and the reverse is
also true. That separation is deliberate — it is what stops one number deciding
everything.

## Honey, and how a Cell gives it up

Every Cell holds Honey, and every Cell has the same capacity
(`config.honey.cellCapacity`). A full Cell is full to the same level as any other full
Cell, so the Honey line drawn on a Cell means the same thing everywhere on the board.

When you score a Word, each of its Cells gives up a **percentage of that capacity** —
never a percentage of what the Cell currently holds. This matters more than it sounds.
A percentage of the *current* amount approaches zero without ever arriving, so Cells
would get emptier and emptier and never actually empty, and the Reseed that puts a
fresh Letter on the board would never fire. Taking a percentage of *capacity* means a
Cell empties after a predictable number of Words.

Two things decide how much a particular Cell gives up:

1. **The Level's harvest setting** (`level.harvestPercent`) — the base fraction of
   capacity removed. This is a difficulty setting: raising it makes the board turn over
   its Letters faster.
2. **The Letter's rarity multiplier** (`config.honey.rarityHarvest`) — rare Letters give
   up more per Word than common ones, so they empty in fewer Words.

That second one is doing real work. A Z that clung to the board as long as an E would
become a Cell you plan your Trails around avoiding. Because it drains faster, it clears
itself off the board instead. Rare Letters are therefore *self-clearing*: you get one,
you use it, it goes. Any Letter with no entry in the table uses
`config.honey.rarityHarvestDefault`.

When a Cell's Honey reaches zero it **Reseeds** — it takes a new Letter and refills to
capacity. How the new Letter is chosen is a separate subject, covered in
[letters.md](./letters.md).

### The two axes, and why they are separate

`level.harvestPercent` decides what the board *loses*. A second setting,
`level.potPercent`, decides what the Pot is *credited* per Cell. They are two numbers
because they are two jobs.

While one number did both, churn could not be tuned at all. Making the board turn over
faster also inflated every score — and since the Pot is what advances you through the
Levels, a "harder" setting pushed you up the difficulty curve faster, undoing the
difficulty it was meant to add. Splitting them means the board can be made to churn
without the score noticing.

Across the Levels, `harvestPercent` climbs and `potPercent` stays flat. That is the
second difficulty axis, independent of the Bees: later Levels drain Cells in fewer
Words, so the board turns over its Letters faster and you cannot settle into one corner
of it.

Rarity applies to both, so a rare Letter still pays more as well as emptying sooner.

## What reaches the Pot

The Honey credited to the Pot is multiplied by a **length multiplier**
(`config.scoring.lengthMultipliers`) before it reaches the Pot. Longer Words are worth
disproportionately more.

The length multiplier applies to the Pot alone. The Pot therefore receives **more than
the board loses**, and that is on purpose. If
longer Words simply drained more Cells, chasing them would starve the Honeycomb and
punish exactly the play the game wants to encourage. The multiplier lets ambition pay
without costing the board.

The multiplier table is read with a rule that appears throughout the game: **the largest
key acts as a floor for anything longer.** The table stops at a certain length, and a
Word longer than that takes the last entry rather than falling off the end of the table.

## What reaches the Clock

The **Bonus** is seconds added to the Clock, decided purely by how many **Letters** the
Word has (`config.clock.bonusMsByLength`). It does not depend on the Level, on
which Letters they were, or on how much Honey the Word paid.

Two details matter:

- **Letters, not Cells.** `Qu` occupies one Cell but counts as two Letters. A Word
  containing it is paid for what the player reads, not for how many Cells it used. The
  same table rule applies — the largest key floors anything longer — and that is not
  theoretical here: nine Cells can spell a ten-Letter Word when one of them is `Qu`.
- **Short Words cannot sustain you.** A Word at the minimum length buys the smallest
  step the table offers. It still pays Honey, so it remains a way out of a board where
  you cannot see anything better, but the time to survive comes from long Words.

  The design originally gave the shortest Word *nothing at all*. That rung was written
  when three-Letter Words were going to be allowed; when they were dropped and the
  minimum stayed at four, the zero went with it. Rather than push the floor back down,
  the ceiling was raised: the gap between the shortest and longest Word is now more than
  a factor of ten, so short Words are relatively worthless without being useless. That
  is the same outcome by a kinder route — nothing the player can do is ever worth
  nothing.

The Bonus rises steeply — the steps follow the Fibonacci sequence. The shape is the
point: a reward that rose gently would make the Clock a measure of how fast you swipe,
and a steep one makes it a measure of how hard you look.

### The cap, and wasted Bonus

**The Clock never rises above the duration the game started with**
(`config.clock.durationMs`). If you are near full and score a Word worth eight seconds,
only the seconds that fit are added and the rest is gone.

The game tells you the truth about this: the number that floats up beside the Clock is
what was *actually* added, not what the Word's length earned. There is a real strategy
hiding here — spend the Clock down before banking your best Word — and showing the
clamped number is what makes it discoverable.

### The last ten seconds

Below `render.clockDangerMs` the Clock stops being a number and starts being an event.
It turns amber, then red; it pulses once a second; and it beats twice a second — once
on the second, once between. At zero a buzzer sounds.

The on-the-second beat, the digit changing, and the pulse are all driven from the same
reading of the Clock, so they cannot drift apart. The between-seconds beat has no visual
counterpart, which is what makes the pair read as a clock rather than a metronome.

## What a Sting costs

Swiping into a Bee, or having a Bee land on a Cell you are holding, **voids the whole
Trail** — no Honey, no Pot, no Bonus, and the Word you were building is lost — and
takes `config.clock.stingCostMs` off the Clock.

If a Sting would take more time than is left, it takes what remains and the game ends.
The event reports the time genuinely lost rather than the nominal cost, for the same
reason the Bonus does.

## What does not score

- **Too short.** No Honey, no time, no sound, no colour. It is read as a change of
  mind, not a mistake.
- **Already played.** A Word may be scored once per game. This is distinguished from a
  Word that does not exist, because the player did find something real and deserves to
  be told which of the two happened.
- **Not in the dictionary.** No cost beyond the time it took.

## Levels

The Pot is what advances you. Each Level declares the Pot total that enters it
(`level.honeyThreshold`), and reaching that total moves you up. Levels never move you
back down, and advancing does not reset anything — not the board, not the Clock, not
the Pot.

The Clock is **global**: it is the same countdown from the first Word to the last, and
no Level touches it.

> **Known and unresolved.** The Level thresholds were tuned when a game ran for several
> minutes, and the Clock produces a considerably shorter game. They are expected to need
> rescaling, and have deliberately been left alone so that the first playtest measures
> the Clock rather than the Clock plus a rebalance. See
> [ADR-0008](../adr/0008-a-countdown-clock-replaces-health.md).

## Worked examples

These use real numbers so the arithmetic can be followed. **The values below are a
snapshot and will drift as the game is tuned** — the shape of the calculation is the
part to trust.

Assume a Cell capacity of 100, a Level harvest of 20%, a Level pot rate of 20%, and
length multipliers of 1.0 at four Letters and 3.0 at seven. Because the two rates are
equal at this Level, the Honey removed and the Honey credited come to the same figure
before the multiplier — at a later Level, where harvest has climbed and the pot rate
has not, they would differ.

### A four-Letter Word: TEAM

| Step | Working | Result |
|---|---|---|
| Base removal per Cell | 100 capacity × 20% | 20 Honey |
| Rarity: T (0.9), E (0.85), A (0.85), M (1.1) | 20 × each multiplier | 18, 17, 17, 22 |
| Removed from the board | 18 + 17 + 17 + 22 | 74 Honey |
| Length multiplier at four Letters | ×1.0 | — |
| **Into the Pot** | 74 × 1.0 | **74** |
| **Onto the Clock** | four Letters | **+1 second** |

The E Cell has given up 17 of its 100. It will survive five or six such Words before it
empties and Reseeds.

### A seven-Letter Word: STINGER

| Step | Working | Result |
|---|---|---|
| Base removal per Cell | 100 capacity × 20% | 20 Honey |
| Rarity: S (0.9), T (0.9), I (0.9), N (0.95), G (1.2), E (0.85), R (0.95) | 20 × each | 18, 18, 18, 19, 24, 17, 19 |
| Removed from the board | sum | 133 Honey |
| Length multiplier at seven Letters | ×3.0 | — |
| **Into the Pot** | 133 × 3.0 | **399** |
| **Onto the Clock** | seven Letters | **+5 seconds** |

Compare the two. STINGER removes under twice the Honey that TEAM does, but pays over
five times as much into the Pot and **five** times as much onto the Clock. That gap is
the entire incentive structure of the game.

### The same Word on a nearly full Clock

STINGER earns five seconds. If the Clock stands 1.2 seconds below its maximum, only
1.2 seconds are added and the remaining 3.8 are discarded. The Pot still receives the
full 399 — the cap applies to time alone.

The game shows the seconds actually added, and shows nothing when the amount rounds
away to zero. It would otherwise report "+0s" for a genuine fraction of a second, which
is worse than saying nothing.
