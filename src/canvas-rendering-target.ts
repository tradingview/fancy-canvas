import { Size } from './size';
import { Binding as CanvasElementBitmapSizeBinding } from './canvas-element-bitmap-size';

/**
 * @experimental
 */
export interface MediaCoordinatesRenderingScope {
	readonly context: CanvasRenderingContext2D;
	readonly mediaSize: Size;
}

/**
 * @experimental
 */
export interface BitmapCoordinatesRenderingScope {
	readonly context: CanvasRenderingContext2D;
	readonly mediaSize: Size;
	readonly bitmapSize: Size;
	readonly horizontalPixelRatio: number;
	readonly verticalPixelRatio: number;
}

/**
 * @experimental
 */
export class CanvasRenderingTarget2D {
	private readonly _context: CanvasRenderingContext2D;
	private readonly _mediaSize: Size;
	private readonly _bitmapSize: Size;

	public constructor(context: CanvasRenderingContext2D, mediaSize: Size, bitmapSize: Size) {
		if (mediaSize.width === 0 || mediaSize.height === 0) {
			throw new TypeError('Rendering target could only be created on a media with positive width and height');
		}
		this._mediaSize = mediaSize;

		// !Number.isInteger(bitmapSize.width) || !Number.isInteger(bitmapSize.height)
		if (bitmapSize.width === 0 || bitmapSize.height === 0) {
			throw new TypeError('Rendering target could only be created using a bitmap with positive integer width and height');
		}
		this._bitmapSize = bitmapSize;

		this._context = context;
	}

	public useMediaCoordinateSpace<T>(f: (scope: MediaCoordinatesRenderingScope) => T): T {
		this._context.save();
		// do not use resetTransform to support old versions of Edge
		this._context.setTransform(1, 0, 0, 1, 0, 0);
		this._context.scale(this._horizontalPixelRatio, this._verticalPixelRatio);
		const result = f({ context: this._context, mediaSize: this._mediaSize });
		this._context.restore();
		return result;
	}

	public useBitmapCoordinateSpace<T>(f: (scope: BitmapCoordinatesRenderingScope) => T): T {
		this._context.save();
		// do not use resetTransform to support old versions of Edge
		this._context.setTransform(1, 0, 0, 1, 0, 0);
		const result = f({
			context: this._context,
			mediaSize: this._mediaSize,
			bitmapSize: this._bitmapSize,
			horizontalPixelRatio: this._horizontalPixelRatio,
			verticalPixelRatio: this._verticalPixelRatio,
		});
		this._context.restore();
		return result;
	}

	private get _horizontalPixelRatio(): number {
		return this._bitmapSize.width / this._mediaSize.width;
	}

	private get _verticalPixelRatio(): number {
		return this._bitmapSize.height / this._mediaSize.height;
	}
}

/**
 * @experimental
 */
export function tryCreateCanvasRenderingTarget2D(
	binding: CanvasElementBitmapSizeBinding,
	contextOptions?: CanvasRenderingContext2DSettings
): CanvasRenderingTarget2D | null {
	const mediaSize = binding.canvasElementClientSize;
	if (mediaSize.width === 0 || mediaSize.height === 0) {
		return null;
	}

	const bitmapSize = binding.bitmapSize;
	if (bitmapSize.width === 0 || bitmapSize.height === 0) {
		return null;
	}

	const context = binding.canvasElement.getContext('2d', contextOptions);
	if (context === null) {
		return null;
	}

	return new CanvasRenderingTarget2D(context, mediaSize, bitmapSize);
}
