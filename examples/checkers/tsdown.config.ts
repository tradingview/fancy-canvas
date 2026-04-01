import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['./index.ts'],
	format: 'iife',
	outDir: '../../bin/checkers/',
	dts: false,
	platform: 'browser',
	outExtensions: () => {
		return {
			js: '.js',
		};
	},
	deps: {
		alwaysBundle: [/.*/],
	},
	copy: ['./*.css', './*.html'],
});
