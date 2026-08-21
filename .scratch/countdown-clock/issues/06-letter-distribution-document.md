# 06 — Letter distribution document

**What to build:** A document explaining how Letters are chosen and distributed across
the Honeycomb, written so a junior engineer or a layperson can follow it. This is the
most opaque part of the game and currently has no explanation outside the code and one
ADR.

Documentation only — nothing in this batch changes the distribution, and this ticket
must not change it either.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `docs/design/letters.md` explains the letter bag and why it is hand-tuned rather
      than drawn from English frequency
- [ ] It explains the vowel band, and why a floor alone produced vowel soup
- [ ] It explains the rare-letter caps and how `Qu` is treated as one Cell but two
      Letters
- [ ] It explains board generation by refinement: what the objective rewards, why
      longer Words and Families are weighted so heavily, and what makes a board
      acceptable
- [ ] It explains Reseed — how a replacement Letter is chosen, why the choice is
      sharpened, and how history forces variety
- [ ] It uses the glossary's vocabulary throughout
- [ ] It names variables rather than values, per the repository convention, except
      where a worked example states the numbers it used
- [ ] No behaviour changes
