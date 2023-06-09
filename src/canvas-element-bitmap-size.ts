import Disposable from './disposable.js';
import { equalSizes, Size, size } from './size.js';
import { BehaviorSubject } from './rx.js';
import { createObservable as createDevicePixelRatioObservable } from './device-pixel-ratio.js';

export type BitmapSizeChangedListener = (this: Binding, oldSize: Size, newSize: Size) => void;
export type BitmapSizeTransformer = (bitmapSize: Size, canvasElementClientSize: Size) => { width: number, height: number } | null;
export type SuggestedBitmapSizeChangedListener = (this: Binding, oldSize: Size | null, newSize: Size | null) => void;

export interface Binding extends Disposable {
	readonly canvasElement: HTMLCanvasElement;
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
}

export interface DevicePixelContentBoxBindingTargetOptions {
	allowResizeObserver?: boolean;
}

class DevicePixelContentBoxBinding implements Binding, Disposable {
	private readonly _transformBitmapSize: BitmapSizeTransformer;
	private readonly _allowResizeObserver: boolean;

	private _canvasElement: HTMLCanvasElement | null = null;
	private _canvasElementClientSize: Size;
	private _bitmapSizeChangedListeners: BitmapSizeChangedListener[] = [];
	private _suggestedBitmapSize: Size | null = null;
	private _suggestedBitmapSizeChangedListeners: SuggestedBitmapSizeChangedListener[] = [];
	// devicePixelRatio approach
	private _devicePixelRatioObservable: BehaviorSubject<number> & Disposable | null = null;
	// ResizeObserver approach
	private _canvasElementResizeObserver: ResizeObserver | null = null;

	public constructor(canvasElement: HTMLCanvasElement, transformBitmapSize?: BitmapSizeTransformer, options?: DevicePixelContentBoxBindingTargetOptions) {
		this._canvasElement = canvasElement;
		this._canvasElementClientSize = size({
			width: this._canvasElement.clientWidth,
			height: this._canvasElement.clientHeight,
		});
		this._transformBitmapSize = transformBitmapSize ?? (size => size);
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
	}

	public get canvasElement(): HTMLCanvasElement {
		if (this._canvasElement === null) {
			throw new Error('Object is disposed');
		}
		return this._canvasElement;
	}

	public get canvasElementClientSize(): Size {
		return this._canvasElementClientSize;
	}

	public get bitmapSize(): Size {
		return size({
			width: this.canvasElement.width,
			height: this.canvasElement.height,
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

	private _resizeBitmap(newSize: Size): void {
		const oldSize = this.bitmapSize;
		if (equalSizes(oldSize, newSize)) {
			return;
		}

		this.canvasElement.width = newSize.width;
		this.canvasElement.height = newSize.height;
		this._emitBitmapSizeChanged(oldSize, newSize);
	}

	private _emitBitmapSizeChanged(oldSize: Size, newSize: Size): void {
		this._bitmapSizeChangedListeners.forEach(listener => listener.call(this, oldSize, newSize));
	}

	private _suggestNewBitmapSize(newSize: Size): void {
		const oldSuggestedSize = this._suggestedBitmapSize;
		const transformedBitmapSize = this._transformBitmapSize(newSize, this._canvasElementClientSize);
		if (transformedBitmapSize === null) {
			return;
		}

		const finalNewSize = size(transformedBitmapSize);

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
			.then(isSupported =>
				isSupported?
					this._initResizeObserver() :
					this._initDevicePixelRatioObservable()
			);
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
};

export function bindTo(canvasElement: HTMLCanvasElement, target: BindingTarget): Binding {
	if (target.type === 'device-pixel-content-box') {
		return new DevicePixelContentBoxBinding(canvasElement, target.transform, target.options);
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
