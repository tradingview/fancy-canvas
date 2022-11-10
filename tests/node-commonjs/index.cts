const { size } = require("fancy-canvas");

const s = size({
	width: 10, height: 20,
});

console.log(JSON.stringify(s));
