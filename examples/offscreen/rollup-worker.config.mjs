import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'worker-thread.ts',
	output: [
		{
			file: '../../bin/offscreen/worker-thread.js',
			format: 'iife',
		},
	],

	plugins: [nodeResolve(), typescript()],
};
