# Honey

A web word game. Drag across a hexagonal honeycomb to spell words, harvest the honey
in each cell, and keep ahead of the bees competing for it.

© 2026 SPARKLER\*FUN — proprietary, see [LICENSE](./LICENSE).

## Getting started

```bash
pnpm install
pnpm dev
```

| Script | Does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Typecheck, then production build to `dist/` |
| `pnpm test` | Vitest over the pure core |
| `pnpm lint` | ESLint, including layer-boundary enforcement |
| `pnpm typecheck` | Types only |
| `pnpm check:licences` | Fails on any disallowed dependency licence |

## Where things are

Four layers, each depending only on the layer beneath it. The boundaries are enforced
by lint rule, not convention — see [ADR-0002](./docs/adr/0002-layered-architecture.md).

```
src/core/      the rules. No canvas, no DOM, no React, no clock.
src/content/   swappable strategies — dictionary, letter generator, word policy.
src/engine/    canvas rendering, hit-testing, audio. Knows no game concepts.
src/themes/    palettes, sprites, sounds, copy, environments.
src/config/    every tunable number in the game.
src/app/       composition root, screens, HUD.
```

## Documentation

Read these before changing behaviour — most "why is it like this?" questions are
answered there rather than in the code.

- **[docs/status.md](./docs/status.md)** — where things stand: what is unfinished, what
  was tried and rejected, and what nobody has measured yet. Read this first if you are
  picking the project up.
- **[CONTEXT.md](./CONTEXT.md)** — the glossary. Words used here mean specific things:
  a *trail* is not a *word*, a *sip* is not a *sting*, and the player's score is the
  *pot*.
- **[docs/design/gameplay.md](./docs/design/gameplay.md)** — the rules as a player
  experiences them.
- **[docs/design/presentation.md](./docs/design/presentation.md)** — colour language,
  animation, HUD, theming.
- **[docs/config-reference.md](./docs/config-reference.md)** — every tunable and what
  it controls.
- **[docs/adr/](./docs/adr/)** — decisions and the alternatives they beat.

## Conventions

**Rules code contains no numeric literals.** Every quantity a designer might tune lives
in `src/config/`. Documentation names variables, never values, so playtesting can
change numbers freely without invalidating the docs.

**The difficulty curve is data.** Progression that reads like a rule is usually a row
in `src/config/levels.ts`.

**Randomness is seeded.** Every random decision draws from an injected `Rng`, so a
whole game replays from its seed. This is the only practical way to reproduce a board
someone reports.

**Only permissive dependency licences.** No copyleft or ShareAlike, including in
dev-only and build-time-only dependencies — see
[ADR-0004](./docs/adr/0004-permissive-licences-only.md).
