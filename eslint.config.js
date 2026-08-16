import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'
import globals from 'globals'

/**
 * Layer boundaries are enforced, not merely documented.
 *
 * ADR-0002 defines four layers, each depending only on the layer beneath it. That
 * arrangement is only worth its indirection if it actually holds, and without a lint
 * rule it erodes within a week.
 */
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

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // Without a resolver that knows TypeScript extensions the plugin cannot follow
      // .ts/.tsx imports, silently classifies every dependency as unknown, and
      // reports nothing at all — a boundary rule that never fires.
      // The pure-JS node resolver is enough here and, unlike the TypeScript
      // resolver, pulls in no native binding that would need a build step.
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
      },
      'boundaries/include': ['src/**/*'],
      // One element per layer folder; every file beneath it belongs to that layer,
      // including files in nested folders such as src/content/dictionary.
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core' },
        { type: 'content', pattern: 'src/content' },
        { type: 'engine', pattern: 'src/engine' },
        { type: 'themes', pattern: 'src/themes' },
        { type: 'config', pattern: 'src/config' },
        { type: 'app', pattern: 'src/app' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // The rules depend on nothing. No canvas, no DOM, no React, no clock.
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { type: 'core' } } },
            },

            // Pluggable strategies see the rules they serve, and nothing above them.
            {
              from: { element: { type: 'content' } },
              allow: { to: { element: { types: { anyOf: ['content', 'core'] } } } },
            },

            // The engine knows geometry, but nothing about honey, bees, or words.
            {
              from: { element: { type: 'engine' } },
              allow: { to: { element: { types: { anyOf: ['engine', 'core'] } } } },
            },

            // Themes are data. They may name types, never reach for behaviour.
            {
              from: { element: { type: 'themes' } },
              allow: { to: { element: { types: { anyOf: ['themes', 'core'] } } } },
            },

            // Configuration is data shaped by core's types.
            {
              from: { element: { type: 'config' } },
              allow: { to: { element: { types: { anyOf: ['config', 'core'] } } } },
            },

            // Only the composition root may see everything at once.
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['app', 'core', 'content', 'engine', 'themes', 'config'] },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
)
