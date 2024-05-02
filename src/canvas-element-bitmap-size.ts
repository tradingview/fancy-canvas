import Disposable from './disposable.js';
import { equalSizes, Size, size } from './size.js';
import { BehaviorSubject } from './rx.js';
import { createObservable as createDevicePixelRatioObservable } from './device-pixel-ratio.js';

export type BitmapSizeChangedListener = (this: Binding<any>, oldSize: Size, newSize: Size) => void;
export type BitmapSizeTransformer = (bitmapSize: Size, canvasElementClientSize: Size) => { width: number, height: number };
export type SuggestedBitmapSizeChangedListener = (this: Binding<any>, oldSize: Size | null, newSize: Size | null) => void;
export type SetOffscreenBitmapSize = (bitmapSize: Size) => void;

export type Canvas2DContext<OffscreenAllowed extends boolean> = OffscreenAllowed extends true ? CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D : CanvasRenderingContext2D;
export type Canvas<OffscreenAllowed extends boolean> = OffscreenAllowed extends true ? OffscreenCanvas | HTMLCanvasElement : HTMLCanvasElement;

export interface Binding<OffscreenAllowed extends boolean = any> extends Disposable {
	readonly canvasElement: HTMLCanvasElement;
	readonly canvas: Canvas<OffscreenAllowed>;
	/**
	 * Canvas element client size in CSS pixels
	 */
	readonly canvasElementClientSize: Size;
	resizeCanvasElement(clientSize: { width: number, height: number }): void;

	readonly bitmapSize: Size;
	subscribeBitmapSizeChanged(listener: BitmapSizeChangedListener): void;
	unsubscribeBitmapSizeChanged(listener: BitmapSizeChangedListener): void;

	readonly suggestedBitmapSize: Size | null;
	subscribeSuggestedBitmapSizeChanged(listener: SuggestedBitmapSizeChangedListener): void;
	unsubscribeSuggestedBitmapSizeChanged(listener: SuggestedBitmapSizeChangedListener): void;
	applySuggestedBitmapSize(): void;

	get2DContext(contextOptions?: CanvasRenderingContext2DSettings): Canvas2DContext<OffscreenAllowed> | null;

	readonly usingOffscreenCanvas: boolean;
	requestOffscreenCanvas(): OffscreenCanvas | null;
	releaseOffscreenCanvas(canvas: OffscreenCanvas): void;
}

export interface DevicePixelContentBoxBindingTargetOptions {
	allowResizeObserver?: boolean;
	/**
	 * If `true` fancy canvas will attempt to use OffscreenCanvas
	 * (if supported by the browser).
	 */
	allowOffscreenCanvas?: boolean;
}

class DevicePixelContentBoxBinding<OffscreenAllowed extends boolean> implements Binding<OffscreenAllowed>, Disposable {
	private readonly _transformBitmapSize: BitmapSizeTransformer;
	private readonly _allowResizeObserver: boolean;

	private _canvasElement: HTMLCanvasElement | null = null;
	private _offscreenCanvas: OffscreenCanvas | null = null;
	private _canvasElementClientSize: Size;
	private _bitmapSizeChangedListeners: BitmapSizeChangedListener[] = [];
	private _suggestedBitmapSize: Size | null = null;
	private _suggestedBitmapSizeChangedListeners: SuggestedBitmapSizeChangedListener[] = [];
	// devicePixelRatio approach
	private _devicePixelRatioObservable: BehaviorSubject<number> & Disposable | null = null;
	// ResizeObserver approach
	private _canvasElementResizeObserver: ResizeObserver | null = null;
	private _offscreenCanvasDetached: boolean = false;
	private _offscreenCanvasSize: Size | null = null;
	private _setOffscreenCanvasSize: SetOffscreenBitmapSize | null = null;

	public constructor(
		canvasElement: HTMLCanvasElement,
		transformBitmapSize?: BitmapSizeTransformer,
		options?: DevicePixelContentBoxBindingTargetOptions,
		setOffscreenCanvasSize?: SetOffscreenBitmapSize,
	) {
		this._offscreenCanvas =
			options?.allowOffscreenCanvas && isOffscreenCanvasSupported()
				? canvasElement.transferControlToOffscreen()
				: null;
		this._canvasElement = canvasElement;
		this._canvasElementClientSize = size({
			width: this._canvasElement.clientWidth,
			height: this._canvasElement.clientHeight,
		});
		this._transformBitmapSize = transformBitmapSize ?? (size => size);
		this._setOffscreenCanvasSize = setOffscreenCanvasSize ?? null;
		this._allowResizeObserver = options?.allowResizeObserver ?? true;

		this._chooseAndInitObserver();
		// we MAY leave the constuctor without any bitmap size observation mechanics initialized
	}

	public dispose(): void {
		if (this._canvasElement === null) {
			throw new Error('Object is disposed');
		}
		this._canvasElementResizeObserver?.disconnect();
		this._canvasElementResizeObserver = null;
		this._devicePixelRatioObservable?.dispose();
		this._devicePixelRatioObservable = null;
		this._suggestedBitmapSizeChangedListeners.length = 0;
		this._bitmapSizeChangedListeners.length = 0;
		this._canvasElement = null;
		this._offscreenCanvas = null;
	}

	public get canvasElement(): HTMLCanvasElement {
		if (this._canvasElement === null) {
			throw new Error('Object is disposed');
		}
		return this._canvasElement;
	}

	public get canvas(): Canvas<OffscreenAllowed> {
		if (this._offscreenCanvas !== null) {
			return this._offscreenCanvas as Canvas<OffscreenAllowed>;
		}
		if (this._canvasElement !== null) {
			return this._canvasElement;
		}
		throw new Error('Object is disposed');
	}

	public get2DContext(contextOptions?: CanvasRenderingContext2DSettings): Canvas2DContext<OffscreenAllowed> | null {
		const offscreenContext = this._offscreenCanvas?.getContext('2d', contextOptions) ?? null;
		if (offscreenContext !== null) {
			return offscreenContext as Canvas2DContext<OffscreenAllowed>;
		}
		return this._canvasElement?.getContext('2d', contextOptions) ?? null;
	}

	public get canvasElementClientSize(): Size {
		return this._canvasElementClientSize;
	}

	public get bitmapSize(): Size {
		if (this._offscreenCanvasDetached) {
			if (!this._offscreenCanvasSize) {
				throw new Error('Size of detached offscreen canvas unknown.');
			}
			return this._offscreenCanvasSize;
		}

		return size({
			width: this.canvas.width,
			height: this.canvas.height,
		});
	}

	/**
	 * Use this function to change canvas element client size until binding is disposed
	 * @param clientSize New client size for bound HTMLCanvasElement
	 */
	public resizeCanvasElement(clientSize: { width: number, height: number }): void {
		this._canvasElementClientSize = size(clientSize);
		this.canvasElement.style.width = `${this._canvasElementClientSize.width}px`;
		this.canvasElement.style.height = `${this._canvasElementClientSize.height}px`;

		this._invalidateBitmapSize();
	}

	public subscribeBitmapSizeChanged(listener: BitmapSizeChangedListener): void {
		this._bitmapSizeChangedListeners.push(listener);
	}

	public unsubscribeBitmapSizeChanged(listener: BitmapSizeChangedListener): void {
		this._bitmapSizeChangedListeners = this._bitmapSizeChangedListeners.filter(l => l !== listener);
	}

	public get suggestedBitmapSize(): Size | null {
		return this._suggestedBitmapSize;
	}

	public subscribeSuggestedBitmapSizeChanged(listener: SuggestedBitmapSizeChangedListener): void {
		this._suggestedBitmapSizeChangedListeners.push(listener);
	}

	public unsubscribeSuggestedBitmapSizeChanged(listener: SuggestedBitmapSizeChangedListener): void {
		this._suggestedBitmapSizeChangedListeners = this._suggestedBitmapSizeChangedListeners.filter(l => l !== listener);
	}

	public applySuggestedBitmapSize(): void {
		if (this._suggestedBitmapSize === null) {
			// nothing to apply
			return;
		}

		const oldSuggestedSize = this._suggestedBitmapSize;
		this._suggestedBitmapSize = null;
		this._resizeBitmap(oldSuggestedSize);
		this._emitSuggestedBitmapSizeChanged(oldSuggestedSize, this._suggestedBitmapSize);
	}

	public get usingOffscreenCanvas(): boolean {
		return Boolean(this._offscreenCanvas);
	}

	public requestOffscreenCanvas(): OffscreenCanvas | null {
		if (!this.usingOffscreenCanvas) {
			throw new Error('Not using OffscreenCanvas.');
		}
		if (this._offscreenCanvasDetached) {
			throw new Error('OffscreenCanvas already detached.');
		}

		this._offscreenCanvasSize = this.bitmapSize;
		this._offscreenCanvasDetached = true;

		return this._offscreenCanvas;
	}

	public releaseOffscreenCanvas(canvas: OffscreenCanvas): void {
		if (canvas === this._offscreenCanvas) {
			this._offscreenCanvasDetached = false;
		}
	}

	private _resizeBitmap(newSize: Size): void {
		const oldSize = this.bitmapSize;
		if (equalSizes(oldSize, newSize)) {
			return;
		}

		if (this._offscreenCanvasDetached) {
			// Since the canvas has been transferred to a worker,
			// the worker needs to change the size, so we are
			// passing the value to the setOffscreenCanvasSize function
			// which is expected to postMessage to the worker.
			this._setOffscreenCanvasSize?.(newSize);
			this._offscreenCanvasSize = newSize;
		} else {
			this.canvas.width = newSize.width;
			this.canvas.height = newSize.height;
		}

		this._emitBitmapSizeChanged(oldSize, newSize);
	}

	private _emitBitmapSizeChanged(oldSize: Size, newSize: Size): void {
		this._bitmapSizeChangedListeners.forEach(listener => listener.call(this, oldSize, newSize));
	}

	private _suggestNewBitmapSize(newSize: Size): void {
		const oldSuggestedSize = this._suggestedBitmapSize;
		const finalNewSize = size(this._transformBitmapSize(newSize, this._canvasElementClientSize));
		const newSuggestedSize = equalSizes(this.bitmapSize, finalNewSize) ? null : finalNewSize;

		if (oldSuggestedSize === null && newSuggestedSize === null) {
			return;
		}

		if (oldSuggestedSize !== null && newSuggestedSize !== null
			&& equalSizes(oldSuggestedSize, newSuggestedSize)) {
			return;
		}

		this._suggestedBitmapSize = newSuggestedSize;
		this._emitSuggestedBitmapSizeChanged(oldSuggestedSize, newSuggestedSize);
	}

	private _emitSuggestedBitmapSizeChanged(oldSize: Size | null, newSize: Size | null): void {
		this._suggestedBitmapSizeChangedListeners.forEach(listener => listener.call(this, oldSize, newSize));
	}

	private _chooseAndInitObserver(): void {
		if (!this._allowResizeObserver) {
			this._initDevicePixelRatioObservable();
			return;
		}

		isDevicePixelContentBoxSupported()
			.then(isSupported => isSupported ? this._initResizeObserver() : this._initDevicePixelRatioObservable());
	}

	// devicePixelRatio approach
	private _initDevicePixelRatioObservable(): void {
		if (this._canvasElement === null) {
			// it looks like we are already dead
			return;
		}

		const win = canvasElementWindow(this._canvasElement);
		if (win === null) {
			throw new Error('No window is associated with the canvas');
		}

		this._devicePixelRatioObservable = createDevicePixelRatioObservable(win);
		this._devicePixelRatioObservable.subscribe(() => this._invalidateBitmapSize());
		this._invalidateBitmapSize();
	}

	private _invalidateBitmapSize(): void {
		if (this._canvasElement === null) {
			// it looks like we are already dead
			return;
		}

		const win = canvasElementWindow(this._canvasElement);
		if (win === null) {
			return;
		}

		const ratio = this._devicePixelRatioObservable?.value ?? win.devicePixelRatio;

		const canvasRects = this._canvasElement.getClientRects();
		const newSize =
			// eslint-disable-next-line no-negated-condition
			canvasRects[0] !== undefined ?
				predictedBitmapSize(canvasRects[0], ratio) :
				size({
					width: this._canvasElementClientSize.width * ratio,
					height: this._canvasElementClientSize.height * ratio,
				});
		this._suggestNewBitmapSize(newSize);
	}

	// ResizeObserver approach
	private _initResizeObserver(): void {
		if (this._canvasElement === null) {
			// it looks like we are already dead
			return;
		}

		this._canvasElementResizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
			const entry = entries.find((entry: ResizeObserverEntry) => entry.target === this._canvasElement);
			if (!entry || !entry.devicePixelContentBoxSize || !entry.devicePixelContentBoxSize[0]) {
				return;
			}
			const entrySize = entry.devicePixelContentBoxSize[0];
			const newSize = size({
				width: entrySize.inlineSize,
				height: entrySize.blockSize,
			});
			this._suggestNewBitmapSize(newSize);
		});
		this._canvasElementResizeObserver.observe(this._canvasElement, { box: 'device-pixel-content-box' });
	}
}

export type BindingTarget = {
	type: 'device-pixel-content-box';
	transform?: BitmapSizeTransformer;
	options?: DevicePixelContentBoxBindingTargetOptions;
	setOffscreenCanvasSize?: SetOffscreenBitmapSize;
};

export function bindTo<T extends BindingTarget>(
	canvasElement: HTMLCanvasElement,
	target: T,
): Binding<T['options'] extends { allowOffscreenCanvas: true } ? true : false> {
	if (target.type === 'device-pixel-content-box') {
		return new DevicePixelContentBoxBinding(
			canvasElement,
			target.transform,
			target.options,
			target.setOffscreenCanvasSize,
		);
	}

	throw new Error('Unsupported binding target');
}

function canvasElementWindow(canvasElement: HTMLCanvasElement): Window | null {
	// According to DOM Level 2 Core specification, ownerDocument should never be null for HTMLCanvasElement
	// see https://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#node-ownerDoc
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return canvasElement.ownerDocument!.defaultView;
}

function isDevicePixelContentBoxSupported(): Promise<boolean> {
	return new Promise((resolve: (val: boolean) => void) => {
		const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
			resolve(entries.every(entry => 'devicePixelContentBoxSize' in entry));
			ro.disconnect();
		});
		ro.observe(document.body, { box: 'device-pixel-content-box' });
	})
		.catch(() => false);
}

function isOffscreenCanvasSupported(): boolean {
	return 'OffscreenCanvas' in window;
}

function predictedBitmapSize(canvasRect: DOMRect, ratio: number): Size {
	return size({
		width:
			Math.round(canvasRect.left * ratio + canvasRect.width * ratio) -
			Math.round(canvasRect.left * ratio),
		height:
			Math.round(canvasRect.top * ratio + canvasRect.height * ratio) -
			Math.round(canvasRect.top * ratio),
	});
}
