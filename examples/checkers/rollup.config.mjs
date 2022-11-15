import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'index.ts',
	output: [
		{
			file: '../../bin/checkers/index.js',
			format: 'iife',
		}
	],

	plugins: [
		nodeResolve(),
		typescript(),
	],
};
