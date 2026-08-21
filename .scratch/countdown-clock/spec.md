# The Countdown Clock

Status: ready-for-agent

## Problem Statement

Honey currently ends when the player's health reaches zero. Health drains at a rate
the level sets, words pause the drain and restore some of it, and stings take a
chunk. It works, but it asks the player to reason about an abstraction — a percentage
of a maximum, moving at a speed they cannot see — and the tension it produces is
vague. A player cannot answer "how much longer do I have?" and cannot tell whether a
long word bought them ten more seconds or two.

Alongside that, play has surfaced five things that make the game harder to read than
it should be:

- Correcting a mis-drag is painful. Backtracking removes one Cell per step, so a
  player who has drawn seven Cells and wants to return to the third must retrace four
  times. Dropping the finger straight back onto the third Cell does nothing, and the
  interface feels frozen at exactly the moment the player is trying to recover.
- Scoring a Word and Reseeding its Cells happen at the same instant. The Word flashes
  blue while depleted Cells flash yellow over the top of it, so the one moment the
  player most wants to see — the Word they just found — is the moment that is hardest
  to read.
- At the end of a game the player is told a number and nothing else. The Words they
  found, which is the part they actually want to talk about, are gone.
- Letters sit slightly high in their Cells.
- The Slab behind the Cells shows the outline of every Cell in it, so the Honeycomb
  reads as overlapping shapes rather than one piece of wax.

Finally, difficulty currently has one usable axis. Bees ramp across Levels, but how
fast the board turns over its Letters is fixed, and the number that would control it
is the same number that decides the score — so it cannot be moved without also
moving how fast the player climbs the Levels.

## Solution

Health is replaced by a **Clock**: a visible countdown, starting at 1:30, shown as
minutes and seconds beside a stopwatch, in the same typography as the Pot. It ticks
in real time. Words add a **Bonus** measured in seconds; Stings take seconds away.
The Clock never rises above the duration the game began with. At zero, the game ends.

The Bonus rises steeply with Word length, so the Clock is sustained by ambition
rather than volume: a four-Letter Word buys a second, a nine-Letter Word buys eight.
A player who only finds short Words runs out; a player who finds long ones keeps
going. This makes the central question of the game legible for the first time — every
Word is worth an amount of time the player can see arriving.

Around that, the five readability problems are fixed, and difficulty gains a second
axis: how fast Cells give up their Honey becomes a per-Level setting independent of
what the Pot is credited, so the board can be made to churn faster without inflating
the score.

## User Stories

1. As a player, I want a Clock counting down in minutes and seconds, so that I always
   know exactly how much game I have left.
2. As a player, I want the Clock to tick in real time, so that the number on screen
   means what it says and I can plan against it.
3. As a player, I want a stopwatch beside the Clock, so that I recognise what the
   number is without reading a label.
4. As a player, I want the Clock set in the same typography as the Pot, so that the
   two things I care about read as a matched pair rather than unrelated widgets.
5. As a player, I want the Clock to start at a minute and a half, so that a game is a
   short, repeatable thing I can fit into a spare moment.
6. As a player, I want a valid Word to add seconds to the Clock, so that playing well
   is what keeps me alive.
7. As a player, I want longer Words to add disproportionately more time, so that I am
   rewarded for looking harder rather than for swiping faster.
8. As a player, I want the shortest Words to add no time at all, so that they remain a
   way out of a stuck board without becoming a strategy.
9. As a player, I want the Clock to stop rising at the duration I started with, so
   that a game cannot be banked into an unbounded session.
10. As a player, I want the seconds a Word actually gave me to appear in green beside
    the Clock, so that I learn what each Word length is worth.
11. As a player, I want that number to show what was really added rather than what was
    theoretically earned, so that I am not told I gained eight seconds when the Clock
    was nearly full and I gained one.
12. As a player, I want no popup at all when a Word's Bonus is entirely wasted against
    the cap, so that the interface does not congratulate me on nothing.
13. As a player, I want the Clock to turn amber when time is getting short, so that I
    am warned before I am in trouble.
14. As a player, I want the Clock to turn red and pulse once a second when time is
    nearly gone, so that the last stretch feels like the last stretch.
15. As a player, I want the warning thresholds set in seconds rather than as a
    proportion, so that the warning arrives at a moment that means something to me.
16. As a player, I want a Sting to cost me seconds, so that Bees remain a real threat
    now that there is no health to lose.
17. As a player, I want the Sting cost to be large enough to notice and small enough
    to recover from, so that one mistake is a setback rather than a game over.
18. As a player, I want the game to end the moment the Clock reaches zero, so that the
    rule is exactly as simple as it looks.
19. As a player, I want to drag my finger back onto any Cell already in my Trail and
    have the Trail end there, so that correcting a long mis-drag takes one movement.
20. As a player, I want that to work even when the Cell I return to is not adjacent to
    where my finger currently is, so that a fast correction across the board behaves
    the way I expect.
21. As a player, I want to be able to truncate all the way back to my first Cell, so
    that I can rebuild a Word without lifting my finger.
22. As a player, I want the Word I just scored to flash on its own, so that I can
    actually see what I found.
23. As a player, I want depleted Cells to Reseed after the scoring flash finishes
    rather than during it, so that two different pieces of news arrive one at a time.
24. As a player, I want to see the Honey drain out of the Cells during the scoring
    flash, so that the Harvest reads as the Word pulling the Honey out.
25. As a player, I want the old Letter to still be visible until the Reseed animation
    swaps it, so that I can see what changed rather than only what it changed to.
26. As a player, I want the Cells of a Word to Reseed in the order I drew them, so that
    the refill ripples down the Word instead of firing as one block.
27. As a player, I want a Cell finished off by a Bee's Sip mid-flash to wait its turn
    like any other, so that the sequence never collapses into simultaneous flashes.
28. As a player, I want to see every Word I found when the game ends, so that I have
    something to look back on and talk about.
29. As a player, I want that list ordered longest first, so that the best thing I did
    is the first thing I see.
30. As a player, I want Words of equal length ordered alphabetically, so that the list
    is stable and easy to read rather than arbitrary.
31. As a player, I want each Word to show the Honey it earned, so that the list records
    what each find was worth.
32. As a player, I want the list to scroll when it is long, so that a good game is not
    truncated to fit the card.
33. As a player, I want the Pot, my best score and the buttons to stay where they are,
    so that the end screen gains information without becoming a different screen.
34. As a player, I want Letters sitting optically centred in their Cells, so that the
    board looks finished.
35. As a player, I want `Qu` to sit on the same line as every other Letter, so that one
    Cell does not look misaligned because of a descender.
36. As a player, I want the Honeycomb to read as one piece of wax with Cells cut into
    it, so that the board looks like a Slab rather than a tray of loose buttons.
37. As a player, I want a single dark border around the whole Honeycomb, so that the
    board has a defined edge.
38. As a player, I want no seams or doubled outlines between neighbouring Cells, so
    that nothing gives away how the Slab is drawn.
39. As a player, I want the Cells to keep their own borders and shadows on top of the
    Slab, so that the board keeps its depth.
40. As a player, I want the Honeycomb to hang from a Bough reaching in from off screen,
    so that the board belongs to the world behind it rather than floating over it.
41. As a player, I want the Bough partly hidden behind what is already on screen, so
    that it reads as depth rather than as a sticker.
42. As a player, I want the Bough to take its colour from the Environment, so that it
    is a silhouette at night and lit by day.
43. As a player, I want the Honeycomb to stay perfectly still, so that the Cell I am
    aiming at is where I last saw it.
44. As a player, I want Cells to give up their Honey faster at later Levels, so that
    the board turns over more quickly as the game gets harder.
45. As a player, I want that to be a separate pressure from the Bees, so that late
    Levels are harder in more than one way.
46. As a player, I want faster churn not to inflate my score, so that reaching a high
    Level is a measure of how well I played rather than of how late it happened.
47. As a designer, I want the Bonus per Word length to live in configuration, so that I
    can retune the entire economy without touching rules code.
48. As a designer, I want the starting duration, the cap, the Sting cost and the warning
    thresholds all in configuration, so that the first playtest can move any of them.
49. As a designer, I want the Honey a Cell gives up and the score the Pot receives to be
    two separate per-Level settings, so that I can move either one alone.
50. As a designer, I want Level thresholds left as they are for this change, so that the
    first playtest measures the Clock rather than the Clock plus a rebalance.
51. As a designer, I want the Slab's gap-filling width and its border width to be
    configurable, so that the wax margin can be tuned by eye.
52. As a designer, I want the Letters' vertical nudge to be a value on the Theme, so
    that a Theme shipping a different face can correct for it.
53. As an engineer, I want health removed rather than deprecated, so that no dead
    concept survives in the rules for someone to trip over later.
54. As an engineer, I want the Clock to advance identically regardless of frame rate, so
    that a slow device does not play a different game.
55. As an engineer, I want the deferred-Reseed logic testable without a canvas, so that
    a sequencing bug is caught by a test rather than by eye.
56. As an engineer, I want the renderer to ask the effects layer what to draw rather
    than reading its internals, so that timing rules live in one place.
57. As a junior engineer, I want a document that explains scoring end to end with
    worked examples, so that I can follow a Word from Letters to Pot and seconds
    without reading the implementation.
58. As a junior engineer, I want a document that explains how Letters are chosen and
    distributed across the Honeycomb, so that the most opaque part of the game is
    something I can reason about.
59. As a layperson, I want both documents written in plain language, so that I can
    understand how the game works without being an engineer.
60. As a maintainer, I want the rule that scoring, Letter distribution and gameplay
    changes ship with their documentation recorded in the repository, so that it
    survives the person who agreed to it.

## Implementation Decisions

### The Clock

- Health is deleted from the rules, not renamed: the maximum, the per-Level drain
  rate, the drain pause, the drain ramp and the per-length restoration all go. The
  module that held the drain arithmetic goes with them — a constant countdown is a
  subtraction inside the simulation step and does not need a module.
- Game state carries remaining milliseconds. The simulation step subtracts elapsed
  time; the game ends when it reaches zero.
- Global configuration gains a clock section: starting duration, maximum, Sting cost,
  and the Bonus table keyed by Word length. All are milliseconds except the table,
  which is expressed in seconds for readability and converted once.
- The Bonus table is read through the existing by-word-length lookup, so the largest
  key floors anything longer. This matters: a Word containing `Qu` can reach ten
  Letters from nine Cells.
- Agreed Bonus values, in seconds, by Letter count: 4→1, 5→1, 6→2, 7→3, 8→5, 9→8.
  These are configuration and are expected to move after the first playtest.
- The Sting cost is a flat duration, agreed at five seconds.
- Applying a Bonus clamps at the maximum. The amount actually applied — the clamped
  amount, not the nominal one — is carried on the word-scored event so presentation
  can show the truth without recomputing it.
- No per-Level scaling of the Clock. A stopwatch that runs fast is lying to the
  player. A per-Level Bonus scale was considered and rejected for this change.

### Scoring and churn

- Each Level gains a second Honey setting. One decides what a Harvest removes from a
  Cell — the churn axis, which ramps across Levels. The other decides what the Pot is
  credited per Cell before the length multiplier, and stays flat.
- The Harvest calculation takes both. The returned Harvest already distinguishes what
  left the board from what reached the Pot; that split becomes load-bearing rather
  than incidental.
- Level thresholds are unchanged. They are known to be scaled for longer games and are
  expected to need rescaling, but only after a measured playthrough.
- The Pot keeps its name. It is no longer a literal count of Honey taken off the
  board, and the glossary now says so.

### Trail

- Stepping onto any Cell already in the Trail truncates the Trail to end at that Cell.
  Adjacency is not required, because a fast correction reports the destination without
  reporting the Cells passed over.
- The existing single-step backtrack branch is deleted. It is this same rule applied at
  one position, and keeping both would be two implementations of one behaviour.
- The distinct backtrack event is retained so that presentation and audio can still
  tell a truncation from an extension.
- Truncating to the first Cell leaves a single-Cell Trail, which is valid.
- Behaviour while a drag is voided by a Sting is unchanged.

### Deferred Reseed

- The rules are untouched. A Harvest that empties a Cell still Reseeds it in the same
  tick, and the Reseed event still carries the Letter it replaced. Only presentation
  changes.
- The effects layer stops exposing raw maps for the renderer to read and instead
  answers two questions: what Letter a Cell should draw at a given moment, with its
  opacity and scale; and how full a Cell should look. Sequencing rules then live in
  one testable place instead of being spread across the renderer.
- A Cell's Reseed animation does not begin while that Cell has a scored flash running.
  This covers both origins — a Cell emptied by the Harvest and a Cell finished off by
  a Bee's Sip during the flash — with one rule.
- Within a scored Word, Reseed animations are staggered in Trail order.
- During the scoring flash, a Cell's drawn Honey falls to empty rather than chasing the
  refilled value. It begins easing toward the true value when the Reseed animation
  starts.
- The old Letter is drawn until the swap point of the Reseed animation. This corrects
  existing behaviour: because the rules swap the Letter immediately, the current
  animation fades out the new Letter and the old one is never seen.

### Presentation

- The HUD's health bar is removed. The Clock takes its place, matching the Pot's size,
  weight and tabular figures.
- The stopwatch is inline vector artwork using the current text colour, so it inherits
  both the type colour and the warning states, and scales with the type.
- Warning states are keyed to absolute remaining seconds, not a proportion of the
  maximum. Agreed: amber at thirty seconds, red at ten, the red pulsing once a second.
- The Bonus appears in green immediately to the right of the Clock, formatted as a
  signed count of seconds. It shows the clamped amount and is suppressed entirely when
  that amount is zero.
- Letters gain a vertical offset expressed as a fraction of Cell size, supplied by the
  Theme's typography. A measured cap-height approach was considered and set aside for
  now in favour of a tuned constant.
- The Slab is drawn as three layers rather than one merged path. Bottom: every Cell
  outline stroked wide in the dark border colour, carrying the Slab's shadow. Middle:
  every Cell outline stroked in the wax colour at no less than the Cell gap, which
  bridges the gaps so the wax reads as continuous. Top: the Cells themselves, keeping
  their own borders and shadows. The dark layer is therefore visible only where the
  wax layer does not reach, which is the outer rim of the whole Honeycomb. Round joins
  throughout.
- The wax stroke width must be at least the Cell gap. Below that the seams reappear,
  and the failure is silent.
- The Bough is drawn between the Environment and the Slab, in a stage that receives the
  board layout — the cached Environment background cannot know where the Honeycomb sits.
  It belongs to the Theme as a shape, tinted per Environment.
- Agreed composition: trunk off screen to the left, limb crossing behind the Trail band,
  one branch descending to the top of the Honeycomb. No change to the board's insets;
  the board does not shrink. The Honeycomb does not sway.

### End of game

- Game state records each scored Word alongside what it earned. The existing set of
  played Words is retained for its uniqueness check.
- Sorting is a pure function: by Letter count descending, then alphabetically.
- The overlay gains a scrolling list beneath the existing score and best, above the
  buttons.

### Documentation

- Two new design documents: one on scoring, one on Letter selection and distribution.
  Both written for a junior engineer or a layperson, both carrying worked examples.
  The scoring document traces a short Word and a long Word from Letters through
  rarity, Harvest, Pot and Bonus.
- An architecture decision record for the Clock, with an amendment note on the existing
  record covering Honey capacity and idle decay rather than a rewrite of it.
- The glossary has already been updated: health is retired; Clock, Bonus and Bough are
  defined; Harvest, Pot, Sting and Level are reworded.
- The convention that scoring, Letter distribution and gameplay changes ship with their
  documentation has already been recorded in the repository.

## Testing Decisions

A good test here asserts on what a caller can observe — state after a sequence of
inputs, or the events the rules emitted — never on how the result was reached. The
existing core tests are the prior art and the pattern to follow: build a game from
stubs, drive it through the public functions, assert on state and drained events.

- **The rules, through the game module's public surface.** The highest seam in the
  codebase and the one the existing end-to-end core tests already use. Covers the
  Clock counting down, a Bonus landing, a Bonus clamping at the maximum, a Sting
  costing time, the game ending at zero, and scored Words being recorded. Prior art:
  the existing game tests.
- **Frame-rate independence.** Retained from the deleted health tests: stepping the
  same total duration in different-sized steps must land on the same remaining time.
  Use a total divisible by every step size under test — a previous version of this
  test compared different durations by accident and passed anyway.
- **Scoring, as pure functions.** The Harvest split across the two per-Level settings,
  and the Bonus lookup including its flooring behaviour above the largest key. Prior
  art: the existing scoring tests.
- **Trail truncation, as a pure function.** Truncating to a non-adjacent Cell, to the
  first Cell, and to the immediately preceding Cell — which must still behave as it
  did. Prior art: the existing trail tests.
- **The effects layer, as a pure fold.** A new test file: fold event sequences at a
  controlled clock and assert on what the layer says to draw. Covers the Reseed
  waiting for the scoring flash, the stagger order, the old Letter persisting to the
  swap point, and a Sip-triggered Reseed queueing behind a running flash.
- **The found-Word sort, as a pure function.** Length descending, alphabetical within
  a length.
- **A configuration invariant.** The Slab's wax stroke width is at least the Cell gap.
  Cheap, and it guards a failure that is otherwise silent.
- **The existing smoke test** continues to prove the wiring holds and the renderer
  survives real state. It is extended to cover the new draw stages only to the extent
  of proving they do not throw.

Not tested, and deliberately so: the stopwatch artwork, the warning colours, the Bonus
popup, the Letter offset, the Slab's appearance and the Bough. These are verified by
eye. Asserting on canvas call arguments would be brittle and would not tell anyone
whether the board looks right. The end-of-game list's markup is likewise untested —
there is no DOM testing stack in this project, and adding one for a single list would
be a larger change than the feature it covered.

## Out of Scope

- **Reducing the minimum Word length to three.** Considered and withdrawn. It would
  require rebuilding the shipped dictionary, which currently contains no three-Letter
  words at all, and a fresh pass over the Banned Word list, which was authored against
  a four-Letter minimum and holds only six three-Letter entries. The current Letter
  distribution is working and should not be disturbed.
- **Rescaling the Level thresholds.** They are expected to need it. The decision is to
  measure first.
- **Other Clock effects**, such as a Bonus that resets the Clock outright. Raised as a
  future idea, deliberately not designed here.
- **Making the Pot matter mechanically.** It remains the score and the Level trigger.
  Its role in the game's story is a later question.
- **Background music, an options screen, corner Cells, and an alternative Theme.**
  Unchanged from their existing parked status.
- **Any change to Bee behaviour.** Preventing Bees from landing on flashing Cells was
  considered as a way to simplify the deferred Reseed and rejected: a just-Harvested
  Cell is the emptiest on the board and therefore exactly what a Hunter steers toward,
  so the change would quietly defang Hunters in order to fix a sub-second visual
  overlap that one presentation rule already handles.
- **Component-level testing infrastructure.**
- **Pushing the diverged local branch.** Outstanding operational work, unrelated.

## Further Notes

The Clock's cap creates a strategic layer that is worth watching in playtesting: a
Bonus earned while the Clock is near full is partly discarded, so there is an
incentive to spend time down before banking a long Word. The green popup showing the
clamped amount is what makes that discoverable. If players do not notice it, that is
a signal to make the waste more visible rather than to remove the cap.

The Bonus economy is deliberately tight. On the agreed values a player must find
roughly one nine-Letter Word, or eight four-Letter Words, to buy back what a single
Sting costs. This is expected to need tuning, and every number involved is
configuration for exactly that reason.

The deferred Reseed corrects a pre-existing bug as a side effect. Because the rules
swap a Cell's Letter immediately, the current animation's fade-out shows the new
Letter, so the Letter being replaced is never actually seen. Fixing the sequencing
without fixing this would leave the animation still describing something that did not
happen.
