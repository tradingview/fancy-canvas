const { readdirSync, renameSync } = require('fs');
const { extname, join } = require('path');
const replaceExt = require('replace-ext');

const args = process.argv.slice(2);
const dir = args[0];
const oldExtension = args[1];
const newExtension = args[2];

readdirSync(dir).forEach(fileName => {
	if (extname(fileName) === oldExtension) {
		const oldFilePath = join(dir, fileName);
		const newFilePath = join(dir, replaceExt(fileName, newExtension));
		renameSync(oldFilePath, newFilePath);
	}
});
