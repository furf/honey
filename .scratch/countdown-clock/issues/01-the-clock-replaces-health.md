# 01 — The Clock replaces health

**What to build:** The game is played against a visible countdown instead of a health
bar. A Clock starts at 1:30, ticks down in real time, and is shown beside a stopwatch
in the same typography as the Pot. Scoring a Word adds seconds to the Clock, decided
by how many Letters it has. A Sting takes seconds away. The Clock never rises above
the duration the game started with. When it reaches zero the game ends.

Health is removed from the game entirely — the drain, its per-Level rate, the pause a
Word bought, the ease-in ramp, and the health bar in the HUD. Nothing is deprecated
and left behind.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The Clock counts down in real time and the game ends when it reaches zero
- [ ] A scored Word adds seconds by Letter count: 4→1, 5→1, 6→2, 7→3, 8→5, 9→8, with
      the largest entry flooring anything longer (a Word with `Qu` can reach ten
      Letters from nine Cells)
- [ ] A Sting costs a flat five seconds
- [ ] A Bonus is clamped so the Clock never exceeds its starting duration, and the
      amount actually applied travels on the word-scored event so presentation need
      not recompute it
- [ ] Starting duration, maximum, Sting cost and the Bonus table are all configuration
- [ ] The HUD shows minutes and seconds beside an inline vector stopwatch using the
      current text colour, matching the Pot's size, weight and tabular figures
- [ ] Health is gone from rules, state, configuration, every Level row, test support
      and the HUD
- [ ] The Clock advances identically regardless of step size, tested over a total
      duration divisible by every step size under test
- [ ] ADR-0008 records the decision, with an amendment note on ADR-0001 rather than a
      rewrite of it
- [ ] `docs/design/scoring.md` is created, explaining scoring end to end for a junior
      engineer or layperson, with a short Word and a long Word traced through worked
      examples
- [ ] `docs/design/gameplay.md` and `docs/config-reference.md` describe the Clock
