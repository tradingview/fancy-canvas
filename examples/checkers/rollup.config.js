import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2'

export default {
	input: 'index.ts',
	output: [
		{
			file: '../../bin/checkers/index.js',
			format: 'iife',
		}
	],

	plugins: [
		resolve({
			customResolveOptions: { moduleDirectory: "../../dist" }
		}),
		typescript({
			typescript: require('typescript'),
		}),
	],
}
