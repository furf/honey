# Boards are refined, not sampled

## Status

accepted

## Context

The first generator drew whole boards at random from a weighted bag and kept any that
cleared a floor on findable word count. Testers reported that words were "rarely longer
than 5 letters, usually only 4", and measurement agreed: **66% of findable common words
were four letters and 2% were seven or more.**

The cause was the objective, not the board. Short words vastly outnumber long ones in
any dictionary, so maximising the *count* of findable words optimises straight into a
sea of four-letter words. The `minLongestWord` invariant was satisfied by a single word
and did nothing.

Sampling cannot fix this. A board with several long words and stems that take multiple
endings is rare enough that no practical number of random draws finds one.

## Decision

Boards are drawn once and then **improved**: repeatedly take one cell, try every letter
it could legally hold, and keep the change if the whole board scores better. Local
search reaches boards that sampling never would.

The objective scores three things:

- **Length**, weighted so a six-letter word is worth far more than a four.
- **Families** — words sharing a stem, such as TUCK / TUCKS / TUCKED / TUCKING. A
  family is worth more than the same number of unrelated words, because scoring several
  words off one stem is what makes play feel fast.
- **Cooccurrence** — neighbouring letters scored against English bigram frequencies
  computed at build time from the common word list, so a path across the honeycomb
  spells plausible fragments rather than noise.

Reseeds use the same objective, and choose among candidate letters by how close each is
to the best one, raised to a power.

## Considered Options

Adding cells was rejected: measurement showed board size barely moves the length
distribution (64% four-letter at two rings, 66% at three). It changes supply, not shape.

Optimising cooccurrence alone was rejected. It would converge on the same
high-probability letters every board and destroy the variety we deliberately measure —
so it is one term among three, and the freshness tests remain the guard.

## Consequences

Measured at two rings, against the previous generator: findable words per board rise
from 39 to 153, six-letter-or-longer words from 2 to 47, and the length distribution
moves from 71/23/4/1 to roughly 41/28/19/8. Boards cost ~150 ms to generate instead of
2 ms, which is spent behind the welcome screen.

Board-to-board overlap rises from 0.015 to about 0.035. Aiming at a shape necessarily
narrows the space, and this is the price. It remains far from repetitive, and the
freshness tests hold it there.

**Reseed selection turned out to matter more than initial generation.** Weighting
candidate letters by raw score barely separates a strong letter from a weak one, because
scores differ by a few per cent. Under that weighting a refined board eroded from 153
findable words to 13 after three passes of reseeds — so a board degraded toward noise
during play regardless of how good it started. This affected the original generator too,
and is a likely cause of what testers were reporting. Sharpening the choice restores 105
words and 28 long words after the same three passes, at almost no cost in variety.
