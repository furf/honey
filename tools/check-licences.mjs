#!/usr/bin/env node
/**
 * Fails if any dependency carries a licence this project does not accept.
 *
 * The rule is stricter than strictly necessary: it covers dev-only dependencies too.
 * Whether a ShareAlike obligation reaches a build-time-only input is exactly the sort
 * of question that is cheap to avoid and expensive to answer.
 *
 * See docs/adr/0004-permissive-licences-only.md.
 */

import { execFileSync } from 'node:child_process'

const ALLOWED = [
  /^MIT$/i,
  /^ISC$/i,
  /^BSD-2-Clause$/i,
  /^BSD-3-Clause$/i,
  /^0BSD$/i,
  /^Apache-2\.0$/i,
  /^Unlicense$/i,
  /^CC0-1\.0$/i,
  /^Python-2\.0$/i,
  /^BlueOak-1\.0\.0$/i,
]

const isAllowed = (licence) =>
  licence
    // Split SPDX expressions and accept only if every alternative is acceptable.
    .replace(/[()]/g, '')
    .split(/\s+(?:OR|AND)\s+/i)
    .every((part) => ALLOWED.some((pattern) => pattern.test(part.trim())))

const raw = execFileSync('pnpm', ['licenses', 'list', '--json'], { encoding: 'utf8' })
const byLicence = JSON.parse(raw)

const violations = []
for (const [licence, packages] of Object.entries(byLicence)) {
  if (isAllowed(licence)) continue
  for (const pkg of packages) violations.push(`${pkg.name}@${pkg.versions.join(',')} — ${licence}`)
}

if (violations.length > 0) {
  console.error(`Disallowed licences found (${violations.length}):\n`)
  for (const violation of violations) console.error(`  ${violation}`)
  console.error('\nSee docs/adr/0004-permissive-licences-only.md')
  process.exit(1)
}

console.error(`All dependency licences accepted (${Object.keys(byLicence).length} distinct).`)
