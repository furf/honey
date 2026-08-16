# Two word lists: ENABLE validates, a common subset generates

## Status

accepted

## Context

A single dictionary has to serve two jobs that pull in opposite directions. Accepting
a player's word should be generous — nothing is more annoying than a real word being
rejected. But the board generator's promise that "words can be discovered" is
worthless if the words it counts are `AALII` and `ZOEAE`, which no player will ever
find.

## Decision

Ship **two** lists derived at build time.

**ENABLE** (172,820 words, public domain, and the list Words With Friends itself uses)
is the validation dictionary: if it is in ENABLE and long enough and unplayed, it
scores.

A **common subset** of roughly 30,000 words is the generator's yardstick. It is
ENABLE intersected with Google Web Trillion Word Corpus frequency counts above a
tuned floor, filtered to lengths 4–9. A board is only accepted if the solver finds
enough *common* words in it.

Both ship as a packed DAWG for O(length) prefix queries, which the solver needs on
every generation attempt and every reseed.

## Considered Options

SUBTLEX-US is the better frequency corpus linguistically, but is distributed under
CC-BY-SA-like terms. Since the game is proprietary, a ShareAlike obligation on a
derived word list is a risk not worth taking for a marginal quality gain in what is
ultimately a "would a player recognise this?" signal. See ADR-0004.

Shipping only a common list was rejected — players would have valid words rejected.
Shipping only ENABLE was rejected — the generator's guarantee would be hollow.

## Consequences

The frequency corpus is a **build-time input only**. It is never bundled; only the
derived word list ships.

`Qu` occupies one cell and counts as two characters, so the solver tokenises `QU` as
a single symbol. The consequence is that ENABLE's ~40 words with a Q not followed by
a U (`QAT`, `QOPH`, `FAQIR`) become unformable. This matches Boggle's long-standing
convention and is accepted deliberately, rather than spending a cell on a bare Q.
