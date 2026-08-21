# Configuration Reference

Every number you can change to alter how the game plays or looks, what it does, and
which file it lives in.

**If you only read one thing:** the game's rules code contains no numbers. Everything a
designer might want to adjust — how fast the board gives up its honey, what a word pays, how
often bees arrive, how big a hexagon is — is a named value in `src/config/`. Change it
there and the behaviour changes; nothing else needs editing.

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
| `rarityHarvest` | Multiplier on the harvest percentage, by letter — rare letters pay more and empty sooner |
| `rarityHarvestDefault` | Applied to any letter absent from that table |

### `config.scoring`

| Variable | Controls |
|---|---|
| `lengthMultipliers` | Pot multiplier by word length — how much longer words outpay the honey they remove |

### `config.clock`

| Variable | Controls |
|---|---|
| `durationMs` | Time a game begins with, and the ceiling a bonus may not push past |
| `stingCostMs` | Time a sting takes off the clock |
| `bonusSecondsByLength` | Seconds a word adds, by **letter** count. Largest key floors anything longer |

`durationMs` is one value doing both jobs on purpose: the rule is that the clock never
rises above where it started, and a separate ceiling would be a second number obliged
to stay equal to the first. See
[ADR-0008](./adr/0008-a-countdown-clock-replaces-health.md).

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
| `lengthWeights` | Score per findable word by length — what makes the generator trade quantity for length |
| `familyWeight` | Score for words sharing a stem, which is what lets a player score in runs |
| `stemLetters` | How many leading letters count as a shared stem (4 matches TUCK across TUCKS, TUCKED, TUCKING) |
| `familyExponent` | How sharply a family beats the same number of unrelated words. Above 1, each extra member is worth more than the last |
| `bigramWeight` | Score for neighbouring letters that actually follow one another in English |
| `longWordLetters` | Letters that make a word count as long |
| `minLongWords` | Long words a board must offer to be accepted |
| `hillClimbSteps` | Single-cell improvements tried when refining a board |
| `reseedSharpness` | How sharply a reseed prefers the best letter. Low values let a refined board erode back to noise during play |

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
| `harvestPercent` | Percentage of cell capacity a harvest removes — the churn axis, which climbs across levels |
| `potPercent` | Percentage of cell capacity credited to the pot per cell, before the length multiplier — held flat |
| `bees.types` | Which bee types may spawn |
| `bees.max` | Bees above which none spawn |
| `bees.spawnIntervalMs` | Cadence of spawns below the maximum |
| `bees.waveMs` | How long bees may arrive for |
| `bees.calmMs` | How long the board stays clear afterwards |
| `bees.speed` | Scales every bee timing this level — above 1 is faster |
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
| `intent` | What this kind is for: forage or hunt. Fixed per type |
| `turnMs` | How long it turns on the spot before setting off |
| `ambientSound` | Continuous buzz while it is on the board |
| `approachSound` | Played as it arrives |
| `intentFloor` | Weight every neighbour keeps regardless of intent, so inclination never becomes a rail |
| `revisitAversion` | How strongly a bee avoids doubling straight back, 0 to 1 |
| `maxHops` | Hops before a bee gives up and leaves, however little it collected |
| `spriteId` | Which sprite the theme draws for this type |

Intent is where a bee's character lives. A forager reads as indifferent to the player;
a hunter reads as stalking them, because it drifts towards the cells they have drained.
Disposition shifts along the difficulty curve by which types a level fields, and at most
one of each kind is on the board at a time.

Falling `sipChance` in later levels makes bees linger rather than fill and leave — a
resting bee still blocks its cell, so it costs routing options rather than honey. See
[ADR-0005](./adr/0005-bee-behaviour-lives-on-bee-types.md).

## `renderConfig` — how it looks and moves

Lives in `src/config/render.ts`, separate from `GameConfig` because none of it is a
rule: changing any value here alters how the game *looks*, never how it *behaves*.
Sizes are given as fractions of a cell's radius, so the board scales to any screen
without a second set of numbers.

### The honeycomb

| Variable | Controls |
|---|---|
| `cellCornerRadius` | How rounded a cell's corners are |
| `cellGap` | Space between neighbouring cells |
| `cellDepth` | How far a cell's shadow sits below it |
| `cellEdgeWidth` | Thickness of a cell's outline |
| `waxGlow` / `waxRim` | Strength and width of the light along a cell's upper edge |
| `slabInflate` | How far the wax slab extends past the cells, which is what makes the walls between them |
| `slabShadowBlur` / `slabShadowOffset` | The single shadow under the whole board |
| `slabEdgeWidth` | Thickness of the slab's outer rim |

### Honey

| Variable | Controls |
|---|---|
| `honeyTweenMs` | How long drawn honey takes to catch up with the real level |
| `honeyMeniscus` | How far the surface bows. Liquids are not flat |
| `honeyGloss` | Strength of the highlight on the surface, which is what makes it look wet |
| `honeySurfaceSteps` | Points sampled along the surface. More is smoother and slower |
| `honeyRippleMs` | How long the surface takes to settle after being disturbed |
| `honeyRippleAmplitude` / `honeyRippleWaves` / `honeyRipplePeriodMs` | Height, number of crests, and speed of the ripple. Honey is viscous: small, single-crested and slow |
| `honeyPourMs` / `honeyPourWidth` | The stream that refills a cell after it reseeds |

### Feedback

| Variable | Controls |
|---|---|
| `scoredFlashMs` / `scoredBlinks` | The green blink on a scored word |
| `rejectedMs` | How long a rejected word's colour lingers |
| `reseedMs` / `reseedBlinks` / `reseedPop` | The blink, and the overshoot as a new letter lands |
| `stungMs` | How long the red on a stung trail lasts |
| `shakeMs` / `shakeAmplitude` | The screen shake on a sting. Skipped entirely when the device asks for reduced motion |
| `vignetteInner` / `vignetteStrength` | Red closing in from the edges of the screen on a sting |
| `popupMs` / `popupRise` | The floating `+142` and `−10` numbers |
| `trailRing` | Ring weight on a selected cell |
| `stateEmptyShade` / `stateGlowShade` | How far a state colour is darkened for the empty part of a cell, so the honey line stays visible |

### Bees

| Variable | Controls |
|---|---|
| `beeSize` | Size of a bee against a cell |
| `beeOffset` | Where a bee sits relative to a cell's centre. Offset so the letter underneath stays readable |
| `beeTravelMs` | How long a bee takes to slide between cells |
| `beeWingHz` | Wingbeat speed |
| `beeEntryDistance` | How far beyond the board a bee starts its flight in |
| `beeLeavingAlpha` | How faint a bee is once it is leaving |

### Layout and motion

| Variable | Controls |
|---|---|
| `boardMargin` | Breathing room around the board |
| `topInset` / `bottomInset` | Space reserved above and below the board for the header and controls |
| `pointerTolerance` | How far outside a cell a finger may stray before the trail drops it |
| `ringStaggerMs` / `introMs` / `gameOverMs` | The ring-by-ring sweeps when a game opens and closes |

## `theme` — presentation only

| Slot | Holds |
|---|---|
| `palette` | Colours, including the state colours in [presentation.md](./design/presentation.md) and the wax slab behind the cells |
| `typography` | Type families and scales |
| `sprites` | Procedural draw functions, keyed by sprite id |
| `logo` | Wordmark for the welcome screen |
| `sounds` | Web Audio synthesis recipes, keyed by event |
| `music` | Sustained sound names per environment — the drone bed under each world |
| `strings` | Branded copy — title, tagline, game-over message. Not functional UI labels |
| `environments[]` | Ordered visual variants: background, ambient sound, particles, tint, optional transition renderer |
| `prefers` | Optional default dictionary and generator, overridable by configuration |

## Composition

Dictionary, letter generator, theme, and level table are **independent axes** assembled
by the composition root. Any one can be swapped without touching the others — a
generator can be compared against another with the theme held fixed.
