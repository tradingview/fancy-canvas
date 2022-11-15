import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
	'eslint:all',
	//'plugin:@typescript-eslint/recommended',
	{
		ignores: [
			'bin/**',
			'dist/**'
		],
	},
	{
		// tools/
		languageOptions: {
			globals: {
				...globals.commonjs,
				...globals.node,
			},
		},
		rules: {
			'array-element-newline': ['error', 'consistent'],
			'arrow-parens': 'off',
			'capitalized-comments': 'off',
			'comma-dangle': 'off',
			'dot-location': 'off',
			'dot-notation': 'off',
			'func-style': 'off',
			'function-call-argument-newline': ['error', 'consistent'],
			'function-paren-newline': 'off',
			'id-length': 'off',
			'implicit-arrow-linebreak': 'off',
			'indent': ['error', 'tab'],
			'lines-around-comment': 'off',
			'lines-between-class-members': 'off',
			'max-len': 'off',
			'max-statements': 'off',
			'multiline-comment-style': 'off',
			'multiline-ternary': 'off',
			'no-confusing-arrow': 'off',
			'no-console': 'off',
			'no-extra-parens': 'off',
			'no-magic-numbers': 'off',
			'no-mixed-operators': 'off',
			'no-negated-condition': 'off',
			'no-plusplus': 'off',
			'no-return-assign': 'off',
			'no-shadow': 'off',
			'no-tabs': 'off',
			'no-ternary': 'off',
			'no-trailing-spaces': 'off',
			'no-undef': 'error',
			'no-undefined': 'off',
			'no-underscore-dangle': 'off',
			'no-var': 'off',
			'object-curly-spacing': ['error', 'always'],
			'object-property-newline': 'off',
			'one-var': 'off',
			'operator-linebreak': 'off',
			'padded-blocks': 'off',
			'prefer-destructuring': 'off',
			'quote-props': 'off',
			'quotes': ['error', 'single'],
			'radix': 'off',
			'sort-imports': 'off',
			'sort-keys': 'off',
			'space-before-function-paren': ['error', 'never'],
			'space-infix-ops': 'off',
			'spaced-comment': 'off',
		},
	},
	{
		files: [
			'**/*.ts',
			'**/*.cts',
			'**/*.mts',
		],
		languageOptions: {
			ecmaVersion: 2022,
			parser: tsParser,
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			// TypeScript does it even better
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'no-use-before-define': 'off',
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
		},
	}
];
