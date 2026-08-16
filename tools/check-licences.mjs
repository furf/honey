#!/usr/bin/env node
/**
 * Fails if any dependency carries a licence this project does not accept.
 *
 * The rule is stricter than strictly necessary: it covers dev-only dependencies too.
 * Whether a ShareAlike obligation reaches a build-time-only input is exactly the sort
 * of question that is cheap to avoid and expensive to answer.
 *
 * One carve-out: MPL-2.0 is accepted for unmodified build tooling that never reaches
 * the bundle, so it is allowed in the dev tree and rejected in the production tree.
 *
 * See docs/adr/0004-permissive-licences-only.md.
 */

import { execFileSync } from 'node:child_process'

/** Accepted anywhere, including in shipped code. */
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

/**
 * Accepted only in the dev tree. File-level copyleft whose obligations attach to the
 * covered files themselves, so unmodified build tooling does not reach our code.
 * Voided by patching or vendoring — see the ADR before doing either.
 */
const ALLOWED_BUILD_TIME_ONLY = [/^MPL-2\.0$/i]

/**
 * Evaluate an SPDX expression against a set of accepted licences.
 *
 * OR means we may choose, so one acceptable alternative is enough — "(MIT OR GPL-3.0)"
 * can be taken under MIT. AND means all terms apply at once, so every part must be
 * acceptable. Parentheses are not nested in practice, so this stays a flat parse.
 */
function isAllowed(licence, patterns) {
  const matches = (term) => patterns.some((pattern) => pattern.test(term.trim()))

  return licence
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/i)
    .some((alternative) => alternative.split(/\s+AND\s+/i).every(matches))
}

function listLicences(prodOnly) {
  const args = ['licenses', 'list', '--json']
  if (prodOnly) args.push('--prod')
  return JSON.parse(execFileSync('pnpm', args, { encoding: 'utf8' }))
}

function violationsIn(byLicence, patterns) {
  const found = []
  for (const [licence, packages] of Object.entries(byLicence)) {
    if (isAllowed(licence, patterns)) continue
    for (const pkg of packages) found.push(`${pkg.name}@${pkg.versions.join(',')} — ${licence}`)
  }
  return found
}

const production = listLicences(true)
const everything = listLicences(false)

// Shipped code gets no carve-outs.
const productionViolations = violationsIn(production, ALLOWED)
// The dev tree additionally tolerates build-time-only licences.
const devViolations = violationsIn(everything, [...ALLOWED, ...ALLOWED_BUILD_TIME_ONLY])

const problems = [
  ...productionViolations.map((v) => `[production] ${v}`),
  ...devViolations
    .filter((v) => !productionViolations.includes(v))
    .map((v) => `[dev] ${v}`),
]

if (problems.length > 0) {
  console.error(`Disallowed licences found (${problems.length}):\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  console.error('\nSee docs/adr/0004-permissive-licences-only.md')
  process.exit(1)
}

const distinct = new Set([...Object.keys(production), ...Object.keys(everything)])
console.error(`All dependency licences accepted (${distinct.size} distinct).`)
