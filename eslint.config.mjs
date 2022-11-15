import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
	//'eslint:recommended',
	//'plugin:@typescript-eslint/recommended',
	{
		ignores: [
			"bin/**",
			"dist/**"
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
			"no-undef": "error",
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
			"no-undef": "off",
		},
	}
];
