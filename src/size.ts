type Size = {
	width: number;
	height: number;
}

export function equal(first: Size, second: Size): boolean {
	return (first.width === second.width) &&
		(first.height === second.height);
}

export default Size;
