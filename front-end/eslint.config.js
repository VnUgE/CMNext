// @ts-check
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

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
            // Semicolons required
            'semi': ['error', 'always'],
            // Trailing commas in multiline (ES5 compatible: arrays, objects, but not function params)
            'comma-dangle': ['error', {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'always-multiline',
                exports: 'always-multiline',
                functions: 'never',
            }],
            // Single quotes for strings
            'quotes': ['error', 'single', { avoidEscape: true }],
            // Consistent spacing
            'indent': ['error', 4, { SwitchCase: 1 }],
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
            'vue/html-indent': ['error', 4],
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
        },
    },
    {
        ignores: ['dist/**', 'bin/**', 'node_modules/**', '*.config.ts', '*.config.js'],
    }
);
