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

**One carve-out: MPL-2.0 is permitted for unmodified build tooling that never reaches
the bundle.** MPL-2.0 is file-level copyleft — its obligations attach to the covered
files themselves, and using such a file unmodified as a build tool does not reach the
code it builds. The carve-out does **not** extend to production dependencies, and does
not survive modification: patching an MPL-covered file triggers a disclosure
obligation on that file, so it must not be forked or patched in place.

The immediate case is `lightningcss`, a direct dependency of Vite used for CSS
transformation. It is absent from the built output.

A `check:licences` script audits the dependency tree, applying the strict list to
production dependencies and the carve-out only to the dev tree. Data assets are
recorded with their provenance and licence where they enter the repo, because tooling
will not catch them.

## Consequences

This directly decided the frequency corpus in ADR-0003: SUBTLEX-US was rejected on
these terms in favour of Google Trillion Word Corpus counts.

Extending the exclusion to build-time-only inputs is deliberately stricter than
strictly necessary. Whether a ShareAlike obligation reaches a derived-but-not-shipped
dataset is exactly the sort of question that is cheap to avoid and expensive to
answer. The MPL-2.0 carve-out is the one place that caution is relaxed, and it is
relaxed narrowly: unmodified, build-time only, never in the bundle.

Because the carve-out depends on the dependency being *unmodified*, patching an
MPL-covered package — via a package-manager patch, a vendored fork, or otherwise —
voids it. Anyone reaching for a patch on such a package needs to revisit this ADR
first.
