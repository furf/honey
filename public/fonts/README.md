# Fonts

All three are licensed under the SIL Open Font License 1.1. Each family keeps its
`OFL.txt` alongside it — the OFL requires the licence to travel with the font software,
so those files must not be separated from the `.woff2` they cover.

Permitted under the font carve-out in
[ADR-0004](../../docs/adr/0004-permissive-licences-only.md): the OFL is permissive and
imposes nothing on work *set* in the font, only on the font software itself.

| Family | File | Used for | Source |
|---|---|---|---|
| Nunito | `nunito/nunito.woff2` | Letters on the board, and all interface text | https://fonts.google.com/specimen/Nunito |
| Poetsen One | `poetsen_one/poetsen_one.woff2` | The word preview above the board | https://fonts.google.com/specimen/Poetsen+One |
| Fredoka | `fredoka/fredoka.woff2` | **Nothing.** Kept for comparison | https://fonts.google.com/specimen/Fredoka |

Poetsen One carries the **Reserved Font Name "Poetsen"**. It may be shipped as-is, but
a modified version must not be distributed under that name.

Fredoka is currently unreferenced and still ships, because Vite copies this directory
verbatim. Delete the folder to save its weight from the build.

## Declaring a weight

Each `@font-face` declares `font-weight: 100 900` deliberately. Where a family is a
single static weight, a declared range that covers the requested weight means the
browser uses the face as-is; a narrow declaration would have it synthesise the rest,
and faux bold on a rounded display face looks smeared. `font-synthesis: none` backs
this up. Where a family is variable, the same declaration lets its real weights work.
