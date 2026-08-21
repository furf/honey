# 07 — Clock warnings and the Bonus popup

**What to build:** The Clock tells the player when time is running out, and every Word
shows what it actually bought. The Clock turns amber when time is getting short and
red — pulsing once a second — when it is nearly gone. Seconds added by a Word appear
in green immediately to the right of the Clock.

The number shown is the amount really added, not the amount nominally earned: with the
Clock near full, an eight-second Bonus that only fitted one second must say one
second. When nothing fits at all, nothing appears.

**Blocked by:** 01 — The Clock replaces health.

**Status:** ready-for-agent

- [ ] Warning states are keyed to absolute remaining seconds, not a proportion of the
      maximum — amber at thirty seconds, red at ten
- [ ] The red state pulses once per second
- [ ] The thresholds are configuration
- [ ] The stopwatch takes the warning colour along with the digits, because it uses the
      current text colour
- [ ] The Bonus appears in green to the right of the Clock, formatted as a signed count
      of seconds
- [ ] It shows the clamped amount, taken from the word-scored event rather than
      recomputed
- [ ] No popup appears when the clamped amount is zero
- [ ] `docs/design/presentation.md` describes the warnings and the popup
