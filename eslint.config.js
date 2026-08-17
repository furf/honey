import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

/**
 * Layer boundaries are enforced, not merely documented.
 *
 * ADR-0002 defines the layers, each depending only on those beneath it. That
 * arrangement is only worth its indirection if it actually holds, and without a lint
 * rule it erodes within a week.
 *
 * Enforced with ESLint's built-in no-restricted-imports rather than a dedicated
 * plugin. The obvious plugin for this pulls in a native binary purely to resolve
 * import paths, whose postinstall script pnpm blocks by default and pnpm 11 treats as
 * an install failure — which broke deployment. Since every cross-layer import here is
 * a relative path, matching the specifier is sufficient and costs no dependencies.
 */

const LAYERS = ['core', 'content', 'engine', 'themes', 'config', 'app']

/** Import patterns that reach into a given layer, whatever the relative depth. */
function reaching(layer) {
  return [`**/${layer}`, `**/${layer}/**`, `../${layer}`, `../${layer}/**`]
}

/**
 * Forbid everything except the layers this one is allowed to see.
 *
 * Stated as a deny-list built from an allow-list, so adding a layer cannot silently
 * grant access to it.
 */
function boundary(layer, allowed) {
  const forbidden = LAYERS.filter((other) => other !== layer && !allowed.includes(other))

  return {
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: forbidden.map((other) => ({
            group: reaching(other),
            message: `${layer} may not import ${other} — see docs/adr/0002-layered-architecture.md`,
          })),
        },
      ],
    },
  }
}

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'tools/wordlists/raw/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Build tooling runs in Node, not the browser.
  {
    files: ['tools/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // The rules depend on nothing. No canvas, no DOM, no React, no clock.
  boundary('core', []),

  // Pluggable strategies see the rules they serve, and nothing above them.
  boundary('content', ['core']),

  // The engine knows geometry, but nothing about honey, bees, or words.
  boundary('engine', ['core']),

  // Themes are authored against the engine's drawing primitives, so they sit above
  // it. They must not reach for the rules.
  boundary('themes', ['engine']),

  // Configuration is data shaped by core's types.
  boundary('config', ['core']),

  // Only the composition root may see everything at once.
  boundary('app', LAYERS),
)
