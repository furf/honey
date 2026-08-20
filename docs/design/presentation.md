# Presentation

How the game looks, sounds and responds, and why.

**If you only read one thing:** the honeycomb is drawn on a canvas by code in
`src/app/render.ts`; the header, the word above the board and the game-over card are
ordinary HTML. Colours and fonts come from a *theme* (`src/themes/`), and every timing
and size comes from `src/config/render.ts`. Nothing visual is hard-coded in the rules.

This document names the setting rather than the number — see
[config-reference.md](../config-reference.md) for the values.

The overall aesthetic is bright, lively, and subtly dimensional, in the register of
Zynga's casual titles: saturated colour, soft depth, generous motion. The honeycomb
itself is gold and amber and stays constant across all environments; the world around
it is what changes.

The direction is **material truth rather than more colour**. Cheap games draw shapes;
the gap between this and a professional one is that wax should look soft and
translucent, honey should look viscous and heavy, and the world should look painted
rather than interpolated. Every visual decision below is in service of that.

**The signature is that honey behaves like honey.** Its surface is a curved meniscus,
not a flat edge; it carries a specular band so it reads as wet; it ripples and settles
when a harvest or a sip disturbs it; and a reseeded cell is refilled by a stream
pouring in from above rather than a level rising out of the floor. This is also what
makes the rarity economy legible as a physical fact — a `Z` visibly empties in two
gulps where an `E` sips down over five.

## Colour language

Colour carries meaning, and each meaning has exactly one colour.

| State | Colour | Motion |
|---|---|---|
| Selecting | Blue | The whole cell takes the colour as the trail grows |
| Valid word | Green | Blink, then settle |
| Already played | Deep bronze | Shake |
| Not a word | Desaturated grey | Trail sags, letters fall |
| Stung / voided | Red | The entire trail turns red; screen shake, health bar flash |
| Too short | — | Trail simply releases |

A state colour covers the **whole cell**, not just its border — the filled portion in
the state colour and the empty portion in a darker shade of it, so the honey line stays
legible while the cell is unmistakably blue, green or red. A border alone was too easy
to miss while a finger was over the board.

On a cell wearing a state colour the letter is drawn **white**: the usual brown glyph
loses contrast against blue, green and red alike.

There is deliberately **no line drawn through a trail's cells**. The cells already
carry the selection colour across their whole face, and a ribbon over the top of that
said the same thing twice while covering the letters underneath.

**Red means damage and nothing else.** An invalid word is the most common non-event in
the game, and a red slap every time is exhausting — so it desaturates rather than
alarms. Bronze for already-played is deliberately deeper and less saturated than the
board's own golds so it reads as distinct rather than as part of the honeycomb.

Every state is paired with a **distinct motion** as well as a colour, so the feedback
survives red/green colour blindness.

## Animation

- **Word accepted** — cells blink green, honey drains on a tween rather than snapping,
  the pot counts up, and the harvested amount floats up from the trail's centroid.
- **Trail voided** — the letters in the word preview jostle loose and fall *behind* the
  honeycomb. This is the reason the render stack carries an effects layer beneath the
  cells as well as above them.
- **Reseed** — the cell blinks several times, the old letter fades out, honey pours
  back in from above, and the new letter fades in with a slight overshoot as it lands.
  A letter changing quietly under a player's thumb is easy to miss entirely, so the
  change is announced rather than merely happening.
- **Sting** — three things at once, because damage has to register even if the player is
  looking at the far side of the board: the screen shakes, red closes in from the edges
  of the screen, and the health bar pulses.
- **Bee arrival** — the bee flies in from beyond the rim along the line from the board's
  centre through its entry cell. It does not descend onto a cell: doing so made bees
  appear *on top of* the board rather than arriving at it.
- **Bee turning** — a bee rotates on the spot towards its next cell before setting off,
  taking the short way round so it never spins most of a circle to face a neighbour.
- **Bee filling** — a bee swells a little with every sip and glows once nearly full, so
  "this one is almost done" is readable while it still matters, rather than only at the
  moment it turns for home.
- **Intro and game over** — the honeycomb scales up from the centre, and letters fall
  away at the end, both **staggered outward by ring**. The ring stagger makes the
  honeycomb's structure legible as structure, which is the game's visual identity.
- **Level transition** — a crossfade between environments. Each environment may supply
  its own transition renderer, with the crossfade as the fallback; the MVP ships only
  the fallback. The engine knows *that* a transition is running and for how long, the
  theme knows what it looks like.

`prefers-reduced-motion` is honoured automatically, with no setting to find. If the
device asks for reduced motion, the screen shake is skipped entirely and CSS animations
are cut to nothing. These are exactly the effects that make motion-sensitive players
ill, so the game reads the operating system's answer rather than asking again.

## Screens and HUD

Three screens: welcome, game, game over.

The welcome screen carries the logo, a start button, and the copyright line. Game over
shows the final pot, a **Play Again** button that starts a new game immediately, and a
smaller link back to the welcome screen. There is **no auto-return timer** — the spec
originally called for returning to the welcome screen after five seconds, which would
have left the Play Again button on screen too briefly to read, let alone press.

During play:

- **Pot** top right, counting up rather than snapping.
- **Health** top left, a horizontal bar with a percentage label.
- **Trail preview** above the honeycomb, showing the letters as they are selected. Once
  the trail is long enough to be valid it also shows a **live honey preview**, so the
  player watches the value change as the trail grows. This is the single thing that
  makes the economy felt rather than opaque — players learn the scoring system by
  watching that number move.
- **Mute** bottom left, a quiet low-opacity icon that brightens on tap. Bottom left
  because most players are right-handed and trails are least likely to start there;
  outside the honeycomb's bounds, with its hit area excluded from the swipe hit-test so
  it can neither be triggered by a swipe nor eat one.

Audio must be unlocked by a user gesture on mobile browsers, so the audio context is
created and resumed on the start tap. Mute state persists.

## Rendering

A single canvas, drawn in layers, bottom to top:

```
environment → fx-behind → comb slab → honeycomb → honey fill → letters → trail → bees → fx-front
```

The **comb slab** is every cell's outline inflated and filled as one shape, so
overlapping hexagons merge into a single piece of wax with one shadow beneath it.
Nineteen tiles with nineteen shadows read as a grid of buttons, and this board is
swiped across rather than tapped. The cells keep their own borders and shadows on top:
the slab supplies the mass, the borders supply the depth.

The HUD is DOM above the canvas rather than drawn, so it gets text rendering and
accessibility for free. Every number in it is set in **tabular figures**: the pot
counts up rather than snapping, and proportional digits made it visibly reflow on
every tick.

The word preview sits in its own band between the header and the board, with its value
beneath it rather than beside it, and is set as large as will fit — the available width
divided by the letter count, so a long word shrinks to the margin and no further.

Two faces, two jobs, both shipped from `public/fonts`.

**Nunito** reads: it sets the letters on the board and every word of interface text.
This is a word game — the letters on the cells are the product — and a rounded face
with open apertures stays legible inside a hexagon at thumb size. Board letters are set
extra-bold and interface text semibold: a cell is glanced at through a bee, a state tint
and a flash, while interface text is actually read. The shipped Nunito is variable across
200-1000, so both are weights the face draws rather than ones the browser fakes.

**Poetsen One** announces: it sets the word being spelled above the board, and nothing
else. Confining the display face to one element is what keeps it an announcement rather
than a texture; across nineteen cells it would compete with the honey rather than sit
in it. The value beneath the word stays in Nunito, because it annotates the word rather
than being part of it, and a display face has no tabular figures to stop it twitching
as the trail grows.

Rounded system faces sit behind both in the stack in case a download is slow or
blocked, and `font-synthesis` is off so no weight is ever faked.

Board letters are sized to stay readable **under** a bee, which sits offset to a cell's
upper left rather than centred.

Every number in the interface is set in tabular figures.

The backdrop is painted once to an offscreen canvas and blitted. Layered ridges, a
treeline of individual trees and two gradients are far too much to rebuild sixty times
a second for a picture that does not change.

Simulation runs at a fixed step with an interpolated draw. The HUD subscribes to state
at a throttled rate rather than per frame, so score and health changes never drive a
re-render on every tick.

## Themes

A theme is a complete presentation: palette, typography, sprites, logo, sounds, music,
branding copy, and its set of environments. Themes are selected at **build time** — not
by URL parameter and not by stored preference. Player-facing theme selection, if it
ever arrives, belongs in an options screen.

An environment is semantically opaque to the rules: it is "visual variant N", not
"weather". A theme whose levels change planets rather than skies requires no changes
outside itself.

Each kind of bee has a continuous buzz while it is on the board, pitched and wobbled
differently, so a player can hear which is present — and that both are — without looking
away. It is kept very quiet and deliberately soft in timbre: a sustained sound that runs
for minutes fatigues the ear, and the first version was described as annoying, which was
as much its sawtooth edge as its level.

Audio is suspended when the page is hidden. Locking a phone stops the render loop but
not the audio graph, so a sustained buzz otherwise keeps playing out of a pocket. Each environment sustains a quiet drone bed, so the world changing is something
heard as well as seen.

Sprites and sound effects are **procedural** — drawn as vector art and synthesised
through Web Audio rather than loaded as assets. This keeps the MVP free of an asset
pipeline and of licensing questions, and both sit behind interfaces so real artwork and
recorded samples can replace them per theme without touching the engine.

Dictionaries and letter generators are independent of themes. A theme may declare a
preferred default for each, but configuration overrides it, so a generator can be
compared against another without changing a pixel.
