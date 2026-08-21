# Letters

How the game decides which Letter goes on which Cell — when a board is created, and
again every time a Cell Reseeds.

This is the most opaque part of Honey. It is written to be read by someone who has
never seen the code, using the terms defined in [CONTEXT.md](../../CONTEXT.md). Per the
repository convention it names configuration variables rather than quoting their
values, so playtesting can retune freely without making this document wrong.

## The problem

A word game lives or dies on its board. Truly random letters give you a consonant
swamp with nothing to find. Letters weighted by how common they are in English give you
vowel soup, because English is vowel-heavy by weight. Neither is fun.

What we actually want is a board with a **shape**: a few long words available, several
Words that share a stem so you can score in quick succession, and no Cell that is dead
weight. That is a much narrower target than "letters that make words".

## The alphabet the game uses

There are 26 symbols, but they are not quite A–Z. **`Qu` replaces `Q`.** A lone Q is
nearly unplayable — it needs a U beside it and the U has to be free — so the two travel
together on one Cell, the way Boggle does it.

This creates a distinction that shows up everywhere: `Qu` occupies **one Cell** but
counts as **two Letters**. Word length is measured in Letters throughout, so nine Cells
can spell a ten-Letter Word. Anything keyed by word length has to cope with that.

## The letter bag

Letters are drawn from a **weighted bag** (`config.generation.letterWeights`) — each
symbol has a weight, and heavier symbols come up more often.

**The weights are hand-tuned, not taken from English letter frequency.** Real frequency
is statistically correct and produces boards nobody enjoys. The bag is tuned for
playability instead.

### The vowel band

Vowels are controlled by a **band**, not a floor: at least
`config.generation.vowelFloor` of the Cells and at most
`config.generation.vowelCeiling`.

A floor alone was tried first and did not work. Once the guaranteed vowels were placed,
the remaining Cells were filled from the whole bag — which is itself vowel-heavy — so
boards drifted to roughly half vowels and degenerated into AEON, ARIA and RAIA. **The
ceiling is what keeps consonants on the board.**

So the fill works in this order:

1. Pick a vowel count at random from inside the band.
2. Draw that many Cells from the vowels only.
3. Draw every remaining Cell from the **consonants only** — never from the whole bag,
   which is the mistake that caused the drift.
4. Shuffle, so the guaranteed vowels are not all clustered in the middle.

### Caps on rare letters

`config.generation.rareLetterCaps` limits how many of a symbol a board may hold — one
J, one Z, two K, and so on. Two Z's on a nineteen-Cell board is two Cells you plan your
Trails around avoiding.

When a cap is reached, the symbol is simply **removed from the draw** rather than
triggering a redraw. A redraw loop with tight caps can spin for a long time or fail to
terminate; removing the option cannot.

Note that rare Letters are also handled by the Honey economy — they drain faster, so
they clear themselves off the board. See [scoring.md](./scoring.md).

## Building a board: draw, then improve

Here is the part that matters most.

The original generator drew whole boards at random and kept any that cleared a floor on
how many words could be found. That sounds reasonable and is wrong. **Short words vastly
outnumber long ones in any dictionary**, so maximising the *count* of findable words
optimises straight into a sea of four-Letter words. Measured on real boards: 66% of
findable words were four Letters, and 2% were seven or more.

Drawing more boards cannot fix it. A board with several long Words and stems that take
multiple endings is rare enough that no practical number of random draws finds one.

So a board is drawn once and then **refined**:

> Repeatedly take one Cell, try every Letter it could legally hold, and keep the change
> if the whole board scores better.

This is a hill climb — local search. It reaches boards that sampling never would. It
runs for up to `config.generation.hillClimbSteps` single-Cell improvements, and stops
early once the board is good enough and a full pass over the Cells finds nothing to
improve.

See [ADR-0006](../adr/0006-board-generation-by-refinement.md) for the measurements.

### What "scores better" means

The objective adds up three things, and the weights decide what kind of board wins.

**Length.** Every findable common Word scores according to how many Letters it has
(`config.generation.lengthWeights`). The weights climb steeply — a six-Letter Word is
worth many times a four-Letter one. This is the term that stops the sea of short words,
and it has to be steep, because there are so many more short words to find.

**Families.** A **Family** is a group of Words sharing a stem — TUCK, TUCKS, TUCKED,
TUCKING. `config.generation.stemLetters` decides how many leading Letters count as a
shared stem, and `config.generation.familyWeight` decides what a Family is worth.

Crucially, `config.generation.familyExponent` is above 1, which means **each extra
member of a Family is worth more than the last**. Without that, four unrelated Words
would score the same as a four-Word Family, and the generator would have no reason to
prefer one. Families are what let a player score several Words in quick succession, and
that is what makes play feel fast.

**Cooccurrence.** Neighbouring Letters are scored against English **bigram** frequencies
— how often one Letter actually follows another — weighted by
`config.generation.bigramWeight`. The frequencies are computed at build time from the
common word list and shipped alongside the dictionary.

This is what makes a path across the Honeycomb spell plausible fragments rather than
noise, and it has a useful side effect: a rare Letter tends to land beside the vowels
that make it usable, rather than stranded among consonants.

> Cooccurrence is deliberately **one term of three, not the whole objective**.
> Optimising it alone would converge on the same high-probability letters every single
> game and destroy the variety — see *Freshness* below.

### When a board is good enough

A board is accepted when all of these hold:

| Setting | Requires |
|---|---|
| `config.generation.minCommonWords` | Enough findable Words from the common list |
| `config.generation.minLongWords` | Enough Words of at least `longWordLetters` |
| `config.generation.minLongestWord` | At least one Word of this length |
| `config.generation.requireEveryCellUsed` | No Cell that appears in no Word at all |

Two of these exist because of a specific failure. `minLongestWord` alone was satisfied
by a *single* long Word and did nothing useful, so `minLongWords` was added to require
several. And `requireEveryCellUsed` is what stops a board carrying a Cell the player
can never do anything with.

If `config.generation.maxGenerationAttempts` passes go by without an acceptable board,
the game keeps the **best board it saw** rather than trying forever. Relaxing beats
hanging: a board that weak is rare, and it is still playable.

## Reseeds: choosing a replacement Letter

When a Cell's Honey runs out it **Reseeds** — it takes a new Letter and refills. This
uses the same objective as generation, in miniature: every candidate Letter is scored by
what the board would look like if the Cell held it.

Three things then shape the choice.

**It must not undo the board.** Candidates that would leave the board still passing
every acceptance test above are preferred over those that would not. If *none* of them
keeps the board acceptable — which can happen, since Bees can push a board below the
bar on their own — the choice falls back to the whole field rather than refusing to
Reseed.

**Recent Letters are penalised.** A Cell remembers its last
`config.generation.reseedHistoryDepth` Letters, and a candidate the Cell held recently
is weighted down. This is what stops a Cell that empties repeatedly from cycling between
the same two Letters all game.

**The choice is sharpened.** This is the subtle one, and it turned out to matter more
than initial generation.

Candidate scores differ by only a few per cent, so weighting the choice by raw score
barely distinguishes a great Letter from a poor one — it is very nearly a uniform random
pick. Under that weighting, a board refined over dozens of steps **eroded back to noise
within a single pass of Reseeds**: measured, 158 findable Words down to 28 after every
Cell had Reseeded once.

That is a board getting worse *while you play it*, regardless of how good it started,
and it is a likely cause of what testers were reporting about boards feeling thin.
`config.generation.reseedSharpness` raises each candidate's relative score to a power,
which concentrates the choice on the strong Letters. The recency penalty supplies the
variety that would otherwise cost.

The pick is still **weighted rather than best-scoring**. Always taking the maximum would
make Reseeds deterministic and the board repetitive.

## Two word lists

The game uses two dictionaries, and they do different jobs:

- **A large list** decides whether a Word the player found is real. It should be
  generous — being told a real word is not a word is the worst feeling in a word game.
- **A smaller "common" list** decides what the generator aims at. Building boards around
  obscure words would produce boards full of Words nobody can see.

So a board is scored on Words from the common list, but the player is judged against
the large one — which means finding something obscure is a genuine bonus rather than a
rejection. See [ADR-0003](../adr/0003-two-word-lists.md).

**Banned Words** — profanity, slurs, explicit sexual vocabulary — are removed from both
lists before they ship, so they can neither be scored nor built into a board. Clinical
and anatomical terms are not banned. See
[ADR-0007](../adr/0007-banned-words.md).

## Freshness

Aiming at a shape necessarily narrows the space of boards, which risks every game
feeling the same. This is guarded by permanent tests rather than by judgement, because
the cooccurrence term actively pushes toward repetition — the tests are the reason it
can be included at all.

Against the **shipped** generator:

- **Overlap between boards** from different seeds is measured as a mean over every pair
  and held below a threshold.
- **No two seeds produce the same board.**

A fuller battery runs against the alternative weighted-bag generator, and additionally
checks that no Word turns up on more than half of all boards, that the vocabulary drawn
across many seeds is many times wider than any single board shows, and that most Words
appear on one board only.

> **Known gap.** Those last three are the sharper measures, and they do not currently
> run against the generator that ships. The shipped generator is the one whose objective
> deliberately narrows the space, so it is the one that most needs them. Extending them
> to it is outstanding work.

## Determinism

Every random choice above draws from an **injected, seeded** generator — the letter
draw, the vowel count, the shuffle, and the Reseed pick. A whole game replays exactly
from its seed.

This is not a nicety. It is the only practical way to reproduce a board someone reports
as bad. See [ADR-0002](../adr/0002-layered-architecture.md).
