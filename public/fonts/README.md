# Fonts

Both fonts are licensed under the SIL Open Font License 1.1. Each keeps its `OFL.txt`
in the same folder — the licence has to travel with the font file, so don't separate
them.

They're allowed here under the font exception in
[ADR-0004](../../docs/adr/0004-permissive-licences-only.md): the OFL puts conditions on
the font file itself, not on anything you set in it.

| Font | File | Used for | Where it came from |
|---|---|---|---|
| Nunito | `nunito/nunito.woff2` | Letters on the board, and all interface text | https://fonts.google.com/specimen/Nunito |
| Poetsen One | `poetsen_one/poetsen_one.woff2` | The word being spelled, above the board | https://fonts.google.com/specimen/Poetsen+One |

Poetsen One has a **Reserved Font Name** ("Poetsen"). You can ship it as-is. If you ever
modify the file, you can't distribute the result under that name.

## Why the weights look odd

Each `@font-face` says `font-weight: 100 900`, which looks wrong for a font that only
has one weight. It's deliberate.

If a font file contains a single weight and you declare only that weight, the browser
will *fake* the others by smearing the letters — "faux bold". Declaring a range tells
the browser to use the real file for any weight you ask for instead. `font-synthesis:
none` in the stylesheet is the belt to that braces.

If you later drop in a variable version of either font, this same declaration lets its
real weights work. Nothing else needs to change.

## Adding a font

1. Put the `.woff2` and its `OFL.txt` in a new folder here.
2. Add an `@font-face` block in `src/app/styles.css`.
3. Add a `<link rel="preload">` in `index.html` — the board is drawn on a canvas, and
   canvas silently falls back to a system font if the real one hasn't loaded yet.
4. Add a row to the table above. The licence checker can't see fonts, so this file is
   the only record that they were checked.
