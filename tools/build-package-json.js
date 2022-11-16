const fs = require('fs');

const args = process.argv.slice(2);
const inputPath = args[0];
const outputPath = args[1];

const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const output = {
	// identification
	name: input.name,
	version: process.env['GITHUB_REF_TYPE'] === 'tag' ?
		process.env['GITHUB_REF_NAME'] :
		input.version,

	// discovery
	author: input.author,
	bugs: input.bugs,
	contributors: input.contributors,
	description: input.description,
	homepage: input.homepage,
	keywords: input.keywords,
	license: input.license,
	repository: input.repository,

	// dependencies
	dependencies: input.dependencies,
	peerDependencies: input.peerDependencies,

	// environment
	cpu: input.cpu,
	os: input.os,

	// module format and entry points
	bin: input.bin,
	exports: input.exports,
	main: input.main,
	man: input.man,
	module: input.module,
	type: input.type,

	// contents
	files: ['**/*.mjs', '**/*.d.mts', '**/*.js', '**/*.d.ts'],
};
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
