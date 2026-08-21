# 09 — The Bough

**What to build:** The Honeycomb hangs from a Bough — a tree limb reaching in from off
screen, trunk out of frame to the left, crossing behind what is already on screen, with
one branch descending to the top of the board. It reads as depth rather than as a
sticker because it is partly hidden, and it takes its colour from the Environment, so
it is a silhouette at night and lit by day.

The board does not move: no sway, no change to its insets, no shrinking to make room.
The Cell a player is aiming at must be where they last saw it.

**Blocked by:** 03 — Slab layers and Letter centring (both restructure the same draw
order; this is a sequencing gate, not a logical one).

**Status:** ready-for-agent

- [ ] The Bough is drawn between the Environment and the Slab
- [ ] Its draw stage receives the board layout, because the cached Environment
      background cannot know where the Honeycomb sits
- [ ] The shape belongs to the Theme; the tint comes from the Environment
- [ ] The trunk is off screen to the left, the limb crosses behind the Trail band, and
      one branch descends to the top of the Honeycomb
- [ ] The board's insets are unchanged and the Honeycomb does not shrink
- [ ] The Honeycomb does not sway
- [ ] It reads correctly across every Environment, day and night
- [ ] `docs/design/presentation.md` describes the Bough and where it sits in the draw
      order
