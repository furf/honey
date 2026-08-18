# Gameplay Rules

The rules a player experiences, stated as concepts. Every quantity is named by its
configuration variable rather than its value — see [config-reference.md](../config-reference.md).
Values live in code and are expected to change with playtesting; the rules here are
not.

Vocabulary is defined in [CONTEXT.md](../../CONTEXT.md).

## The honeycomb

The honeycomb is rings 0 through `config.board.rings` around a centre cell — two rings
by default, 19 cells. Fewer cells means bigger letters and less analysis paralysis.
Three rings remains supported and is one configuration value away. Pointy-top hexagons in axial coordinates, so every cell has a direct
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
`level.harvestPercent` of capacity from each cell, **scaled by the rarity of that
cell's letter** (`config.honey.rarityHarvest`). A `Z` gives up more than an `E`, so it
pays better and empties in fewer words — rare letters clear themselves off the board
instead of becoming a cell to route around. The player's pot
receives that total multiplied by a length multiplier drawn from
`config.scoring.lengthMultipliers`, so longer words are worth disproportionately more
than the honey they actually remove from the board.

When a cell's honey reaches zero it **reseeds**: it takes a new letter and its honey is
restored to full. The honey meter shows how much is left rather than how many words
remain, since a rare letter empties faster than a common one.

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

A bee enters on the outer ring, hops between adjacent cells, and occasionally stops to
sip. It occupies exactly one cell at a time, and any trail that reaches that cell is
stung.

There are two kinds of bee, and they are different **types** rather than two moods of
one — so each has its own sprite and its own buzz, and which is present is legible at a
glance and audible without looking:

- **Forager** — drawn towards fuller cells, looking for honey. Wears a flower and
  carries a pollen basket.
- **Hunter** — drawn towards emptier cells, looking for the player. A cell's honey level
  is a record of how the player has been playing, and the cells they keep using are the
  drained ones, so an empty cell is where a sting is most likely to land. Leaner, with a
  visible stinger.

At most **one of each kind** is ever on the board, so two bees are always one of each
rather than a pair of the same.

Movement is erratic but not aimless. Every neighbour keeps at least
`beeType.intentFloor` of weight regardless of intent — without a floor an inclination
becomes a rail, and a forager could never cross an empty cell. A bee also avoids
doubling straight back, in proportion to `beeType.revisitAversion`, because
ping-ponging between two cells reads as indecision rather than movement.

Disposition shifts across the difficulty curve by **which kinds a level fields**. The
first bee a player ever meets is a forager, which mostly ignores them; hunters arrive
once bees are understood.

Before each move a bee **turns on the spot** towards its next cell over
`beeType.turnMs`, and only then flies. The turn is a phase of its own rather than
something that happens during travel, so a bee visibly commits to a direction before it
moves. It is still standing on its cell while turning, so it still stings.

Bees do not arrive continuously. Each level alternates a **wave**, during which bees may
arrive, with a **calm**, during which none do — a threat that is always present stops
being a threat. Waves lengthen and calms shorten as levels progress. A calm ends only
once the board is clear, so a wave never begins on top of stragglers from the last one.
`level.bees.speed` scales every bee timing, so bees quicken across the curve.

A bee is done when it fills up, or after `beeType.maxHops` if it has not — a bee that
rarely sips would otherwise never leave at all.

A done bee then **flies to the nearest exit** rather than disappearing from where it
stood. It stops sipping and steps outward each hop until it reaches the outer ring, then
leaves the board. On a hexagonal honeycomb any neighbour on a higher ring is one hop
closer to the edge, so stepping outward is already the shortest route. It is still
visibly present on the way out, and still stings anything that touches it.

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

Bees arrive on `level.bees.spawnIntervalMs` while a wave is running, up to
`level.bees.max`. A departing bee still occupies its cell and can still sting, so it
counts against the maximum.

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
