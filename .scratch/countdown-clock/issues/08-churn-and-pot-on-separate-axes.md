# 08 — Churn and Pot on separate axes

**What to build:** How fast Cells give up their Honey becomes its own difficulty
setting, separate from what the player scores. Later Levels drain Cells faster, so the
board turns over its Letters more quickly, without that also inflating the Pot and
pushing the player up the Levels faster.

Today one per-Level number does both jobs, which is why churn cannot be tuned at all.

**Blocked by:** 01 — The Clock replaces health (both write `docs/design/scoring.md`;
01 creates it and this ticket extends it).

**Status:** ready-for-agent

- [ ] Each Level carries two Honey settings: what a Harvest removes from a Cell, and
      what the Pot is credited per Cell before the length multiplier
- [ ] The Harvest calculation takes both, and the split between what left the board and
      what reached the Pot becomes load-bearing rather than incidental
- [ ] The removal setting ramps across Levels; the Pot setting stays flat
- [ ] Level thresholds are left exactly as they are — they are expected to need
      rescaling, but only after a measured playthrough
- [ ] Both settings are tested directly, including that moving one does not move the
      other
- [ ] `docs/design/scoring.md` explains the two axes and why they were separated
