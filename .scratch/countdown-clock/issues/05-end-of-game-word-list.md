# 05 — End-of-game Word list

**What to build:** When the game ends, the player sees every Word they found, ordered
longest first with equal lengths alphabetical, each showing the Honey it earned. The
list scrolls when it is long, so a good game is not truncated to fit the card. The
Pot, the best score and the buttons stay where they are.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Game state records each scored Word alongside what it earned
- [ ] The existing set of played Words is retained for its uniqueness check
- [ ] Sorting is a pure function: Letter count descending, then alphabetical
- [ ] The sort is tested directly
- [ ] The overlay shows the list beneath the score and best, above the buttons
- [ ] The list scrolls rather than overflowing or clipping
- [ ] Word counts are by Letters, so a Word containing `Qu` sorts by what the player
      reads, not by how many Cells it used
