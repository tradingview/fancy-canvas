import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
	//'eslint:recommended',
	//'plugin:@typescript-eslint/recommended',
	{
		ignores: [
			"bin/**",
			"dist/**"
		]
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
		}
	}
];
