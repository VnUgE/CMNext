// @ts-check
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      // NOTE: Formatting (indent, quotes, semi, commas, html layout) is owned
      // by Prettier (.prettierrc).
      // Prefer const
      'prefer-const': 'error',
      // No unused vars (but allow unused function params with _)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow any type when necessary
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow console in development
      'no-console': 'warn',
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  // Must be last: turns off all formatting rules in favor of Prettier.
  prettierConfig,
  {
    ignores: ['dist/**', 'bin/**', 'node_modules/**', '*.config.ts', '*.config.js'],
  }
);
