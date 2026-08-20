# Banned words are filtered out at build time

## Status

accepted

## Context

A word game will happily accept anything in its dictionary, and ENABLE contains
profanity, slurs, and explicit sexual vocabulary. A casual game shown to testers and
children cannot score those, and its board generator should not be building boards
around them either.

The line asked for is one of **register, not subject**: clinical and anatomical terms
stay in play, vulgar and abusive ones go.

## Decision

Filtering happens **at build time**, before the dictionary is packed. Banned words are
therefore absent entirely — they cannot be scored, cannot be counted as findable, and
cannot influence a generated board. A player who traces one gets the ordinary
"not a word" response, with no acknowledgement that anything was filtered.

The list is **hand-authored** in `tools/wordlists/banned.mjs` rather than imported. An
external list would bring a licence question for something that ships only as an
absence, and none is tuned to this particular line.

Matching runs in three tiers, because a blocklist's real failure mode is removing
innocent words rather than missing guilty ones:

- **exact** — the written forms only. For short terms whose inflections are ordinary
  English: `jap` must not take `japes`, `spic` must not take `spices`, `mong` must not
  take `monger`, `prick` must not take `prickly`.
- **stems** — the word plus genuine inflections, including English's spelling changes
  (`rape`/`raping`, `gypsy`/`gypsies`, `shag`/`shagged`). A remainder only counts if it
  is a known suffix, which is what keeps `grape`, `rapier` and `therapist`.
- **fragments** — matched anywhere, for terms that appear inside compounds such as
  `motherfucker`. Deliberately tiny: this tier is where over-blocking comes from.

An **allow** list wins over all three, and holds both the clinical vocabulary that stays
in play and the few innocent words caught as collateral.

## Considered Options

Runtime filtering was rejected. It costs work on every word judged, and it leaves
banned words in the generator's view, so a board could still be built around one that
the player is then refused.

Plain substring matching was rejected outright: it takes `analysis` with `anal`,
`class` with `ass`, and `grape` with `rape`.

## Consequences

249 words are removed from a 104,146-word list. Filtering happens before the common
subset, the bigram statistics and the packed output are derived, so every downstream
artefact is built from what remains.

Some collateral is deliberate. `chink` and `cripple` have innocent senses; `spastic`
is also clinical; `shittah` and `shittim` are real if obscure. A game cannot read
context, and the cost of over-blocking a rare word is far lower than the cost of
showing a slur to a player.

Listing a term in both `exact` and `stems` throws at build time. That combination looks
like it is narrowing a match while the stem quietly keeps inflecting — it took `cocky`
with `cock` before the guard existed.

The tests assert the shipped dictionary rather than the filter, and most of them guard
words that must **survive**. That is the direction the mistakes go.
