# Permissively licensed dependencies only

## Status

accepted

## Context

The game is proprietary and ships under copyright. A copyleft dependency discovered
late is expensive to remove, and the risk is easy to walk into via data assets —
word lists, frequency corpora, sound samples, fonts — which are not covered by the
usual package-manager licence tooling and are exactly what a word game needs.

## Decision

Only **MIT, BSD, Apache-2.0, ISC, Unlicense, CC0, and public domain** are permitted in
shipped code. **GPL, LGPL, AGPL, CC-BY-SA, and any other copyleft or ShareAlike terms
are excluded** — including in dev-only dependencies and in build-time-only data inputs
that never ship.

**Carve-out one: the SIL Open Font License is permitted for fonts.** The OFL is
permissive, not copyleft — it imposes no terms on work *set* in the font, only on the
font software itself. Its two real obligations are that the licence text travels with
the font, and that a modified font is not redistributed under a Reserved Font Name.
Both are satisfied by shipping `OFL.txt` beside the file and not modifying it.

Fonts are recorded with their provenance in `public/fonts/README.md`, because the
dependency tooling cannot see them. Each family keeps its `OFL.txt` beside it; those
files must not be separated from the font they cover. Where a family declares a
Reserved Font Name — Poetsen One does — it may ship as-is but a modified version must
not carry that name.

**Carve-out two: MPL-2.0 is permitted for unmodified build tooling that never reaches
the bundle.** MPL-2.0 is file-level copyleft — its obligations attach to the covered
files themselves, and using such a file unmodified as a build tool does not reach the
code it builds. The carve-out does **not** extend to production dependencies, and does
not survive modification: patching an MPL-covered file triggers a disclosure
obligation on that file, so it must not be forked or patched in place.

The immediate case is `lightningcss`, a direct dependency of Vite used for CSS
transformation. It is absent from the built output.

A `check:licences` script audits the dependency tree, applying the strict list to
production dependencies and the MPL carve-out only to the dev tree. It cannot see fonts
or data assets at all, which is why those record their provenance and licence in the
repository where they enter it.

## Consequences

This directly decided the frequency corpus in ADR-0003: SUBTLEX-US was rejected on
these terms in favour of Google Trillion Word Corpus counts.

Typography was the reason the font carve-out became necessary. Under the original
rule the project could not ship *any* open font, since almost every one is OFL — which
would have left a word game setting its letters in whatever the browser reached for
first. That is a poor outcome from a rule meant to protect against copyleft, and the
OFL is not copyleft in the sense the rule was written to guard against.

Extending the exclusion to build-time-only inputs is deliberately stricter than
strictly necessary. Whether a ShareAlike obligation reaches a derived-but-not-shipped
dataset is exactly the sort of question that is cheap to avoid and expensive to
answer. Both carve-outs are narrow: the OFL one covers font software only and imposes
nothing on what is set in it, and the MPL one covers unmodified build tooling that
never reaches the bundle.

Because the carve-out depends on the dependency being *unmodified*, patching an
MPL-covered package — via a package-manager patch, a vendored fork, or otherwise —
voids it. Anyone reaching for a patch on such a package needs to revisit this ADR
first.
