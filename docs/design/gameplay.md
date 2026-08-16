# Gameplay Rules

The rules a player experiences, stated as concepts. Every quantity is named by its
configuration variable rather than its value — see [config-reference.md](../config-reference.md).
Values live in code and are expected to change with playtesting; the rules here are
not.

Vocabulary is defined in [CONTEXT.md](../../CONTEXT.md).

## The honeycomb

The honeycomb is rings 0 through 3 — one centre cell and three concentric bands,
37 cells total. Pointy-top hexagons in axial coordinates, so every cell has a direct
east and west neighbour and no direct north or south. Each cell holds a position, a
letter, and a quantity of honey. Positions never change for the life of a game.

## Forming a word

A trail begins when the player presses a cell and grows as they drag into adjacent
cells. A trail may not revisit a cell it already contains. Dragging back onto the
immediately previous cell removes the last cell instead of adding it. A drag that
skips past a cell — a fast flick crossing a non-adjacent boundary — does not extend
the trail and does not interpolate; the trail simply stays where it was.

On release, the trail is judged in this order:

1. **Too short** — fewer than `config.words.minLetters` letters. No penalty, no sound,
   no feedback beyond the trail releasing. The player evidently changed their mind.
2. **Stung** — the trail reached a cell occupied by a bee. Resolved at the moment of
   contact, not on release: the trail is voided immediately, nothing is harvested, and
   the player loses `config.health.stingCost`.
3. **Already played** — a valid word the player already found this game. No honey, no
   health, but distinct feedback, because the player did find a real word and deserves
   to know why it did not score.
4. **Not a word** — absent from the dictionary. No honey, no health cost.
5. **Valid** — harvested and scored.

The `Qu` cell is a single cell bearing two characters. It counts as two letters toward
`config.words.minLetters` and toward the length multiplier, so a four-letter word
containing it is drawn across three cells. Words containing a Q not followed by a U
cannot be formed and are excluded from both word lists.

## Honey and scoring

Every cell has the same capacity, `config.honey.cellCapacity`. A valid word removes
`level.harvestPercent` of capacity from *each* cell in the word. The player's pot
receives that total multiplied by a length multiplier drawn from
`config.scoring.lengthMultipliers`, so longer words are worth disproportionately more
than the honey they actually remove from the board.

When a cell's honey reaches zero it **reseeds**: it takes a new letter and its honey is
restored to full. Because transfers are fractions of a constant capacity, the number of
words a cell survives is fixed and a player can count it.

## Health

Health runs from `config.health.max` to zero and drains continuously at
`level.healthDrainPerSecond`. The drain does not pause during a drag — the only thing
that suppresses it is scoring.

A valid word pauses the drain for `level.drainPauseMs` and restores health according to
`config.health.restoreByLength`, capped at maximum. When the pause expires the drain
eases in from zero to the level's full rate over `config.health.drainRampMs`; this ramp
exists so the health bar does not visibly jerk back into motion, and is too short to be
played around.

At zero health the game ends.

## Bees

A bee enters the board, hops between adjacent cells, and occasionally stops to sip. It
occupies exactly one cell at a time, and any trail that reaches that cell is stung.

Bees are telegraphed. A bee is visible approaching from off-board with an audible buzz
before it lands, so a sting is never a surprise — only a mistake. As a bee fills, its
abdomen visibly swells, so "this one is leaving soon" is readable without a meter.

At each hop a bee sips with probability `beeType.sipChance`, taking
`beeType.sipPercent` of that cell's capacity. Honey a bee takes is **permanently gone**
— it does not return to the honeycomb and never reaches the pot. A bee leaves the board
once it has taken `beeType.sipCapacity` sips.

A bee that does not sip still blocks its cell. Lowering `sipChance` therefore makes
bees more obstructive per unit of honey stolen, costing the player routing options
rather than honey.

The number of bees present is kept within `level.bees.min` and `level.bees.max`: below
the minimum one spawns immediately, below the maximum one spawns on
`level.bees.spawnIntervalMs`.

## Levels

Reaching a level's `honeyThreshold` advances the player to it. Levels are never
surfaced as a number — the player perceives a level change as a shift in environment
and a transition sound.

A level sets its bee population and behaviour overrides, its health drain rate and
drain pause, its harvest percentage, and its environment. Advancing does **not** reset
the honeycomb; letters, honey, and played words all carry across. The final level
plateaus and play continues indefinitely.

The first level has no bees at all, so a new player learns to form words before
learning to avoid anything. Bees arrive at the second level. On a level that introduces
an *additional* bee, hop interval is eased relative to the previous level so that two
difficulty increases never land at once — this is expressed purely as data in the level
table, not as a rule in code.

## Board generation

A generated honeycomb is rejected unless it satisfies every invariant in
`config.generation`: a minimum count of findable common words, at least one word of
substantial length, and no cell that participates in zero words. Boards are generated
and tested until one passes.

The same invariants are re-checked on every reseed. A candidate letter is scored both
by how many new words it creates and by how different it is from the recent letters
that cell has held, so a cell that reseeds repeatedly does not keep returning the same
letter. Recent history depth is `config.generation.reseedHistoryDepth`.

The letter pool is a hand-tuned bag with caps on duplicate rare letters, rather than
raw English frequency, because a 37-cell board that happens to be a consonant swamp is
unplayable however statistically legitimate it is.

Vowels are held inside a **band**, not merely above a floor. A floor alone leaves the
remaining cells drawing from a bag that is itself vowel-heavy, and boards drift to
roughly half vowels — which yields words like `AEON` and `RAIA` rather than words
players enjoy finding. The ceiling is what keeps consonants on the board.

Every game should feel new, so board-to-board variety is measured rather than assumed:
the overlap between any two boards' word sets, whether any word recurs across boards,
and how much of the vocabulary appears on only one board. A generator leaning on the
highest-frequency letters would serve the same handful of words repeatedly, and these
measurements exist to catch that long before a player would notice it.

All randomness comes from a single seeded generator, so any board a player reports can
be reproduced exactly from its seed.
