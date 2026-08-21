# 02 — Trail truncation to any active Cell

**What to build:** A player correcting a mis-drag can drop their finger onto any Cell
already in the Trail and the Trail ends there. Having drawn S-T-I-N-G-E-R, moving back
to the I leaves S-T-I selected. This works whether or not the Cell is adjacent to
where the finger currently is, because a fast correction reports where the finger
landed without reporting what it passed over.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Stepping onto any Cell in the Trail truncates the Trail to end at that Cell
- [ ] Adjacency is not required for a truncation
- [ ] Truncating to the first Cell leaves a valid single-Cell Trail
- [ ] Stepping onto the immediately previous Cell still removes the last Cell, as it
      always did — it is this same rule at one position
- [ ] The single-step backtrack branch is deleted rather than kept alongside
- [ ] The backtrack event is still emitted, so presentation and audio can tell a
      truncation from an extension
- [ ] Behaviour while a drag is voided by a Sting is unchanged
- [ ] `docs/design/gameplay.md` describes the new behaviour
