# Bee behaviour lives on bee types, not on levels

## Status

accepted

## Context

Two requirements pull in different directions. Honey taken per sip must be tunable
per level, so the economy can be shaped across the difficulty curve. It must also be
tunable per *kind* of bee, because more than one kind is anticipated — a slow bee with
a large appetite is a different threat from a fast one with a small appetite, and both
are interesting.

Putting every bee value flat on the level makes the first easy and the second a
refactor. Putting them all on the bee type makes the second easy and the first
impossible.

## Decision

A **bee type** owns behaviour: `sipPercent`, `sipCapacity`, `sipChance`,
`hopIntervalMs`, `sipDurationMs`, and its sprite. A **level** declares which types can
spawn (`level.bees.types`), how many may be present (`level.bees.min` /
`level.bees.max`), how often they arrive (`level.bees.spawnIntervalMs`), and **may
override any field of a type it spawns**.

Capacity is counted in **sips** (`sipCapacity`), not in honey units. A bee's visit is
therefore a fixed number of stops regardless of its appetite, and a greedier type
costs more honey per visit rather than leaving sooner.

**Forager and hunter are two types, not two moods of one type.** Intent was originally
rolled per bee from weights on a single `worker`, which meant a level could field two
foragers and a player could not tell one bee from another. As types they carry their
own sprite and their own buzz, so which kind of bee is on the board is legible at a
glance and audible without looking.

A level's bee population takes **at most one of each type**, so two bees are always one
of each rather than a pair of the same.

Mid-flight intent shifting is removed. A bee that changed job halfway through a visit
would contradict its own sprite and its own sound.

## Consequences

A new bee is a data file, not a code change — which is the composability the project
asked for, applied to the one entity most likely to gain variants.

Because capacity is measured in sips, the swelling-abdomen fill animation maps to a
clean fraction per sip for every type, and "this bee is nearly full" stays readable
without knowing which type it is.

Disposition now shifts across the difficulty curve by *which types a level fields*
rather than by reweighting one type's intents — which is what `level.bees.types`
already expressed, finally doing real work.

`sipChance` is deliberately below certainty, so a bee sometimes rests on a cell
without taking anything. A resting bee still blocks its cell, so lowering `sipChance`
makes bees *more obstructive per unit of honey stolen* — it costs the player routing
options rather than honey. This is why the value falls in later levels rather than
rising: bees that sip greedily fill up and leave, and lingering is the greater threat.
