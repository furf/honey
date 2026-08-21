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
A concentric band of cells around the board's centre. Ring 0 is the single centre cell,
ring 1 is the six around it, and so on. How many rings the board has is a setting; two
rings, or 19 cells, is the default.
_Avoid_: Row, layer, orbit

**Honeycomb**:
The whole board — every cell and their arrangement.
_Avoid_: Grid, hive, comb

**Slab**:
The single piece of wax the cells are cut into, drawn as one shape behind them all.
It gives the board its mass; the cells' own borders give it depth.
_Avoid_: Comb, backing, tray, plate

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
Emptying a word's cells of honey, and the score that earns. The honey a cell gives up
and the score the pot receives are deliberately not the same number: one is a
difficulty setting, the other is a scoring one.
_Avoid_: Score, collect, points

**Pot**:
The player's running score, filled by harvesting. Named for the honey pot, and still
read as honey by the player, though it is no longer a literal count of what came off
the board.
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

**Clock**:
The time the player has left. Counts down in real time and is shown as minutes and
seconds. Words add to it and stings take from it, but it never rises above the
duration the game began with. At zero the game ends.
_Avoid_: Health, timer, lives, HP

**Bonus**:
The seconds a word adds to the clock, decided by its length. The shortest words add
nothing and each step up is worth more than the last, so the clock is sustained by
ambition rather than by volume.
_Avoid_: Reward, extension, credit, refill

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
without harvesting, and the clock loses time.
_Avoid_: Hit, damage, bite

### Progression and Presentation

**Level**:
A stage of difficulty, entered by reaching a honey threshold. Determines how many
bees are present, how they behave, how fast the board gives up its honey, and which
environment is shown. Never surfaced to the player as a number.
_Avoid_: Round, stage, tier, wave

**Environment**:
The visual and audible world around the honeycomb — sky, ambient sound, weather or
setting. Purely presentational; carries no rules.
_Avoid_: Background, scene, weather, skin

**Bough**:
The tree limb the honeycomb hangs from, reaching in from off screen. Part of the
theme rather than the environment, because it has to meet the honeycomb wherever the
board is laid out.
_Avoid_: Branch, limb, tree

**Theme**:
A complete swappable presentation: palette, typography, sprites, logo, sounds,
branding copy, and the set of environments. Chosen at build time.
_Avoid_: Skin, style, palette
