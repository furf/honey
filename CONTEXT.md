# Honey

A single-player web word game. The player drags across a hexagonal grid of lettered
cells to spell words, harvesting honey from each cell they touch, while bees compete
for the same honey and sting anyone who swipes through them.

## Language

### The Board

**Cell**:
One hexagon on the board. Holds a position, a letter, and a quantity of honey.
_Avoid_: Tile, square, space

**Ring**:
A concentric band of cells around the board's center, numbered 0 (the single center
cell) through 3 (the outer band). The board is exactly rings 0–3, or 37 cells.
_Avoid_: Row, layer, orbit

**Honeycomb**:
The whole board — all 37 cells and their arrangement.
_Avoid_: Grid, hive, comb

**Letter**:
The character shown on a cell. Usually one character; `Qu` is a single letter
occupying a single cell but counting as two characters toward word length.
_Avoid_: Glyph, character

### Play

**Trail**:
The ordered sequence of cells under an in-progress drag, before the player lifts.
A trail may not revisit a cell, and each step must move to an adjacent cell.
_Avoid_: Path, chain, selection, swipe

**Word**:
A trail that the player has released and that passed validation — long enough,
present in the dictionary, and not already played this game.
_Avoid_: Match, find, solution

**Banned Word**:
A term the game will not accept: profanity, slurs, and explicit sexual vocabulary.
Removed from the dictionary before it ships, so it can neither be scored nor built
into a board. Clinical and anatomical terms are not banned.
_Avoid_: Blocked word, filtered word, blacklist, profanity list

**Harvest**:
The transfer of honey from a word's cells into the pot.
_Avoid_: Score, collect, points

**Pot**:
The player's accumulated honey. The game's score.
_Avoid_: Hive, score, points, total

**Honey**:
The quantity held by a cell and accumulated in the pot. Every cell has the same
capacity, but a harvest removes a fraction that depends on the cell's letter, so rare
letters pay more and empty sooner.
_Avoid_: Nectar, currency

**Family**:
A group of words on the board sharing a stem, such as TUCK, TUCKS, TUCKED, TUCKING.
Families are what let a player score several words in quick succession, so the board
generator seeks them out deliberately.
_Avoid_: Group, cluster, set, run

**Reseed**:
Replacing a cell's letter and restoring its honey to full, triggered when the cell's
honey runs out.
_Avoid_: Refresh, respawn, reroll, shuffle

**Health**:
The player's remaining tolerance, from 100 to 0. Drains continuously at a rate set by
the current level. Words pause the drain and restore health; stings cost health.
At 0 the game ends.
_Avoid_: Lives, HP, stamina

### Hazards

**Bee**:
A hazard that moves across the honeycomb one cell at a time, taking honey and
occupying the cell it rests on. Leaves the board once it has filled up.
_Avoid_: Wasp, enemy, hazard

**Bee Type**:
A kind of bee, carrying its own appetite, speed, capacity, sprite and sound. Levels
choose which types can appear and may override any of their behaviour.
_Avoid_: Species, breed, variant, class

**Forager**:
The bee type drawn towards fuller cells, looking for honey. Wears a flower.
_Avoid_: Gatherer, worker, collector

**Hunter**:
The bee type drawn towards emptier cells, looking for the player — a drained cell is a
record of the letters they keep using. Carries a visible stinger.
_Avoid_: Stalker, soldier, wasp, attacker

**Wave**:
A window during which bees may arrive, followed by a calm during which none do. Waves
lengthen and calms shorten as levels progress, so pressure builds rather than being
constant.
_Avoid_: Swarm, round, burst, phase

**Sip**:
A bee's extraction of honey from the cell it rests on. Honey a bee takes is gone —
it does not return to the honeycomb or reach the pot.
_Avoid_: Steal, drain, sting

**Sting**:
What happens when a trail reaches a cell occupied by a bee: the trail is voided
without harvesting, and the player loses health.
_Avoid_: Hit, damage, bite

### Progression and Presentation

**Level**:
A stage of difficulty, entered by reaching a honey threshold. Determines how many
bees are present, how they behave, how quickly health drains, and which environment
is shown. Never surfaced to the player as a number.
_Avoid_: Round, stage, tier, wave

**Environment**:
The visual and audible world around the honeycomb — sky, ambient sound, weather or
setting. Purely presentational; carries no rules.
_Avoid_: Background, scene, weather, skin

**Theme**:
A complete swappable presentation: palette, typography, sprites, logo, sounds,
branding copy, and the set of environments. Chosen at build time.
_Avoid_: Skin, style, palette
