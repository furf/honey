# 04 — Two-beat Harvest

**What to build:** Scoring a Word and Reseeding its emptied Cells stop happening at the
same instant. First the Word flashes on its own while its Honey visibly drains out.
Then, once that finishes, the depleted Cells Reseed — old Letter out, new Letter in,
Honey pouring back — staggered in the order the player drew them, so the refill
ripples down the Word.

This corrects an existing bug as a side effect: because the rules swap a Cell's Letter
immediately, today's animation fades out the *new* Letter and the Letter being
replaced is never actually seen.

Prefactor first: the effects layer stops exposing raw maps for the renderer to read
and instead answers what a Cell should draw at a given moment. Sequencing then lives
in one testable place rather than spread across the renderer.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The effects layer answers what Letter a Cell should draw, with its opacity and
      scale, and how full the Cell should look — the renderer no longer reads its
      internals
- [ ] The prefactor lands with no visible change and the existing tests still pass
- [ ] A Cell's Reseed animation does not begin while that Cell has a scored flash
      running, whichever event caused the Reseed
- [ ] A Cell finished off by a Bee's Sip during a scored flash queues behind it
- [ ] Reseed animations within a scored Word are staggered in Trail order
- [ ] A Cell's drawn Honey falls to empty during the scoring flash and only begins
      easing toward its true value when the Reseed animation starts
- [ ] The Letter being replaced is drawn until the swap point of the Reseed animation
- [ ] The rules are untouched — this is presentation only
- [ ] Sequencing is tested by folding event sequences at a controlled clock, without a
      canvas
- [ ] `docs/design/presentation.md` describes the two beats
