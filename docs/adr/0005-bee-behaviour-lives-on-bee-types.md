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

The MVP ships a single type referenced by every level, so the indirection is present
but carries no variety yet.

## Consequences

A new bee is a data file, not a code change — which is the composability the project
asked for, applied to the one entity most likely to gain variants.

Because capacity is measured in sips, the swelling-abdomen fill animation maps to a
clean fraction per sip for every type, and "this bee is nearly full" stays readable
without knowing which type it is.

`sipChance` is deliberately below certainty, so a bee sometimes rests on a cell
without taking anything. A resting bee still blocks its cell, so lowering `sipChance`
makes bees *more obstructive per unit of honey stolen* — it costs the player routing
options rather than honey. This is why the value falls in later levels rather than
rising: bees that sip greedily fill up and leave, and lingering is the greater threat.
