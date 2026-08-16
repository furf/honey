# Configuration Reference

Every tunable quantity in the game, what it controls, and where it lives.

**This file deliberately records no values.** Values live in code, under
`src/config/`, and are expected to change constantly during playtesting. The concepts
here are stable; the numbers are not. When a number changes, this file should not need
to.

Anything a designer might want to tune is a configuration variable. Rules code contains
no numeric literals.

## Ownership

Configuration is layered, matching the architecture (see
[ADR-0002](./adr/0002-layered-architecture.md)):

| Scope | Holds |
|---|---|
| `config` | Constants that hold for the whole game regardless of level |
| `level[]` | The difficulty curve — an ordered table where the curve *is* the data |
| `beeType` | Behaviour of a kind of bee; levels may override any field |
| `theme` | Presentation only — never rules |

Progression that reads as a rule is often just a row in the level table. "Bees slow
down on the level that introduces a second bee" is not logic; it is one cell of
`hopIntervalMs` being larger than the row above it.

## `config` — global

### `config.words`

| Variable | Controls |
|---|---|
| `minLetters` | Shortest scoring word, counted in letters not cells |
| `maxLetters` | Longest word retained when building the word lists |

### `config.honey`

| Variable | Controls |
|---|---|
| `cellCapacity` | Honey a full cell holds. All transfers are percentages of this |

### `config.scoring`

| Variable | Controls |
|---|---|
| `lengthMultipliers` | Pot multiplier by word length — how much longer words outpay the honey they remove |

### `config.health`

| Variable | Controls |
|---|---|
| `max` | Starting and maximum health |
| `restoreByLength` | Health restored by a valid word, by length |
| `stingCost` | Health lost to a sting |
| `drainRampMs` | Ease-in from zero to full drain rate when a pause expires. Animation polish |

### `config.generation`

| Variable | Controls |
|---|---|
| `minCommonWords` | Findable common words a board must contain to be accepted |
| `minLongestWord` | Length of the longest word a board must contain |
| `requireEveryCellUsed` | Whether every cell must appear in at least one word |
| `letterWeights` | The letter bag the generator draws from |
| `vowelFloor` | Minimum proportion of cells holding vowels |
| `vowelCeiling` | Maximum proportion of cells holding vowels |
| `rareLetterCaps` | Per-letter caps on duplicates of rare letters |
| `reseedHistoryDepth` | How many past letters a cell remembers, to force variety on reseed |
| `maxGenerationAttempts` | Attempts before relaxing invariants rather than hanging |

### `config.board`

| Variable | Controls |
|---|---|
| `rings` | Concentric rings around the centre cell |
| `orientation` | Hexagon orientation — determines which neighbours exist |

### `config.timing`

| Variable | Controls |
|---|---|
| `simulationHz` | Fixed simulation step rate |
| `hudUpdateHz` | Throttled rate at which the HUD reads state |

## `level[]` — the difficulty curve

| Variable | Controls |
|---|---|
| `honeyThreshold` | Pot total that advances the player into this level |
| `environmentId` | Which of the theme's environments is shown |
| `healthDrainPerSecond` | Constant drain rate for this level |
| `drainPauseMs` | How long a valid word suspends the drain |
| `harvestPercent` | Percentage of cell capacity a harvest removes |
| `bees.types` | Which bee types may spawn |
| `bees.min` | Bees below which one spawns immediately |
| `bees.max` | Bees above which none spawn |
| `bees.spawnIntervalMs` | Cadence of spawns below the maximum |
| `bees.overrides` | Per-level overrides of any bee type field |
| `transition.sound` | Sound marking entry into this level |
| `transition.durationMs` | Length of the environment transition |

## `beeType` — behaviour of a kind of bee

| Variable | Controls |
|---|---|
| `sipPercent` | Percentage of cell capacity taken per sip |
| `sipCapacity` | Sips before the bee fills up and leaves. Counted in sips, not honey |
| `sipChance` | Probability of sipping at a given hop. Below certainty on purpose |
| `hopIntervalMs` | Time between hops |
| `sipDurationMs` | Pause while sipping |
| `arrivalMs` | How long the approach is visible before the bee can sting |
| `departureMs` | How long a departing bee stays visible on its way out |
| `intentWeights` | Weights over forage / hunt / wander — what this bee is inclined to do |
| `intentShiftChance` | Chance of reconsidering intent at each hop |
| `intentFloor` | Weight every neighbour keeps regardless of intent, so inclination never becomes a rail |
| `revisitAversion` | How strongly a bee avoids doubling straight back, 0 to 1 |
| `maxHops` | Hops before a bee gives up and leaves, however little it collected |
| `spriteId` | Which sprite the theme draws for this type |

Intent is where a bee's character lives. A forager reads as indifferent to the player;
a hunter reads as stalking them, because it drifts towards the cells they have drained.
Levels override `intentWeights`, so disposition shifts along the difficulty curve.

Falling `sipChance` in later levels makes bees linger rather than fill and leave — a
resting bee still blocks its cell, so it costs routing options rather than honey. See
[ADR-0005](./adr/0005-bee-behaviour-lives-on-bee-types.md).

## `theme` — presentation only

| Slot | Holds |
|---|---|
| `palette` | Colours, including the state colours in [presentation.md](./design/presentation.md) |
| `typography` | Type families and scales |
| `sprites` | Procedural draw functions, keyed by sprite id |
| `logo` | Wordmark for the welcome screen |
| `sounds` | Web Audio synthesis recipes, keyed by event |
| `music` | Declared for future use; unused in the MVP |
| `strings` | Branded copy — title, tagline, game-over message. Not functional UI labels |
| `environments[]` | Ordered visual variants: background, ambient sound, particles, tint, optional transition renderer |
| `prefers` | Optional default dictionary and generator, overridable by configuration |

## Composition

Dictionary, letter generator, theme, and level table are **independent axes** assembled
by the composition root. Any one can be swapped without touching the others — a
generator can be compared against another with the theme held fixed.
