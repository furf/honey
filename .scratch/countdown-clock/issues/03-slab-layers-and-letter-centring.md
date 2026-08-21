# 03 — Slab layers and Letter centring

**What to build:** The Honeycomb reads as one piece of wax with Cells cut into it,
carrying a single dark border around the whole board and no seams or doubled outlines
between neighbouring Cells. The Cells keep their own borders and shadows on top, so
the board keeps its depth. Letters sit optically centred in their Cells rather than
slightly high, `Qu` included despite its descender.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The Slab is drawn as three layers: every Cell outline stroked wide in the dark
      border colour at the bottom carrying the Slab's shadow, every Cell outline
      stroked in the wax colour above it, then the Cells themselves
- [ ] The wax stroke is at least as wide as the Cell gap, so the gaps are bridged and
      the wax reads as continuous
- [ ] The dark layer is therefore visible only at the outer rim of the whole Honeycomb
- [ ] Round joins throughout, so no spikes appear at the hexagon corners
- [ ] The gap-filling width and the border width are both configuration
- [ ] A test asserts the wax stroke is at least the Cell gap — below that the seams
      silently return
- [ ] Letters take a vertical offset supplied by the Theme's typography, applied
      uniformly so `Qu` sits on the same line as every other Letter
- [ ] `docs/design/presentation.md` describes both
