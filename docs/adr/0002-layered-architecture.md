# Layered architecture with pluggable content strategies

## Status

accepted

## Context

The game is an MVP whose entire purpose is experimentation: letter-placement
algorithms, dictionaries, difficulty curves, palettes, and sprite sets are all
expected to be swapped and compared. A conventional game loop that mutates state
inside the draw callback would make every one of those experiments a code change and
none of them testable.

## Decision

Four layers, each depending only on the layer beneath it through interfaces:

- **core** — the rules. `GameState` and a pure `step(state, dt, input)` function
  covering trail validity, harvests, the clock, bees, reseeds, and level progression.
  No canvas, no DOM, no React, no clock, no randomness except an injected seeded RNG.
- **content** — swappable strategies behind interfaces: `Dictionary`,
  `LetterGenerator`, `WordPolicy`.
- **engine** — canvas rendering, the layer stack, pointer-to-cell hit testing, and
  Web Audio. Its *behaviour* knows nothing about honey, bees, or words: it draws a
  hexagon, fills one with a liquid, plays a sound. Every function here is named for the
  shape or the sound, never for what the game happens to use it for — `fillLiquid`, not
  `fillHoney`.

  The one exception is deliberate. The engine declares the *shape* of a theme, and a
  theme is a vocabulary the game supplies, so its slots are named after game concepts
  (`cellFill`, `slabFill`, `trailStung`). That is the point of the type: it is the list
  of things a theme must answer for. The rule is therefore about behaviour, not about
  every identifier — engine code may not *do* anything game-specific, but the theme
  contract it publishes necessarily *names* game-specific things.
- **themes** — palettes, typography, sprites, sounds, copy, and environments, as data
  and draw functions. Themes sit **above** the engine rather than beside it: a sprite
  is a function written against the engine's drawing primitives, so a theme depends on
  the engine by its nature. Themes must not reach for the rules.

An **app** composition root assembles a concrete configuration from these parts.
Dictionary, generator, theme, and level table are **independent** axes — a theme may
declare preferred defaults, but configuration overrides them, so a generator can be
A/B tested without changing a pixel.

Rendering is canvas-based with a fixed 60Hz simulation step and interpolated draw.
React owns only screen routing and the HUD, subscribing to state at a throttled rate
rather than per frame.

## Considered Options

DOM and CSS rendering was rejected: 37 animated hexagons plus a moving sprite is
within reach for CSS, but theming and per-frame effects would then live in
stylesheets, which contradicts the swappable-theme requirement. WebGL via Pixi was
rejected as disproportionate for 37 cells.

Letting themes own the dictionary and generator was rejected because it couples two
axes that need to vary independently during tuning.

## Consequences

The entire game is deterministic and unit-testable without a browser: given a seed
and a sequence of inputs, the state is reproducible, which is the only practical way
to reproduce a reported bad board.

Import boundaries between layers are enforced by lint rule. Without enforcement the
layering degrades quickly, and the abstraction cost is only worth paying if it holds.

Enforcement uses ESLint's built-in `no-restricted-imports` rather than a dedicated
boundaries plugin. The obvious plugin pulls in a native binary purely to resolve
import paths, and its postinstall script is blocked by pnpm's default policy — which
pnpm 11 treats as an install failure, breaking deployment. Every cross-layer import
here is a relative path, so matching the specifier is sufficient and costs nothing.
The rules are written as an allow-list per layer and inverted into a deny-list, so
adding a layer cannot silently grant access to it.

`Environment` is semantically opaque to the core — it is "visual variant N", not
"weather". A theme whose levels change planets rather than skies needs no core
changes.
