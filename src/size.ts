export type Size = Readonly<{
	width: number;
	height: number;
}> & { __brand: 'Size' };

export function size({ width, height }: { width: number, height: number }): Size {
	if (width < 0) {
		throw new Error('Negative width is not allowed for Size');
	}

	if (height < 0) {
		throw new Error('Negative height is not allowed for Size');
	}

	return Object.freeze({ width, height }) as Size;
}

export function equalSizes(first: Size, second: Size): boolean {
	return (first.width === second.width) &&
		(first.height === second.height);
}
