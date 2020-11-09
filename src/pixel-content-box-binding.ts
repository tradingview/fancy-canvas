import { Binding, BindingOptions, CanvasConfiguredListener, Size } from 'coordinate-space';

export class PixelContentBoxBinding implements Binding {
	public readonly canvas: HTMLCanvasElement;
	private _cssSize: Size;
	private _pixelSize: Size;
	private _options: BindingOptions;
	private _canvasConfiguredListeners: CanvasConfiguredListener[] = [];
	private _observer: ResizeObserver;

	public constructor(canvas: HTMLCanvasElement, options: BindingOptions) {
		this.canvas = canvas;
		this._options = options;
		this._observer = this._createObserver();
		const size = {
			width: this.canvas.clientWidth,
			height: this.canvas.clientHeight,
		};
		this._cssSize = size;
		this.resizeCanvas(size);
		this._pixelSize = this._cssSize;
	}

	public destroy(): void {
		this._observer.disconnect();
		(this.canvas as any) = null;
	}

	public get canvasSize(): Size {
		return {
			width: this._cssSize.width,
			height: this._cssSize.height,
		};
	}

	public resizeCanvas(size: Size): void {
		this._cssSize = {
			width: size.width,
			height: size.height,
		};
		this.canvas.style.width = `${this._cssSize.width}px`;
		this.canvas.style.height = `${this._cssSize.height}px`;
	}

	public get pixelRatio(): number {
		const result = (this._cssSize.width > 0) ? this._pixelSize.width / this._cssSize.width : 1;
		return result > 1 || this._options.allowDownsampling ? result : 1;
	}

	public subscribeCanvasConfigured(listener: CanvasConfiguredListener): void {
		this._canvasConfiguredListeners.push(listener);
	}

	public unsubscribeCanvasConfigured(listener: CanvasConfiguredListener): void {
		this._canvasConfiguredListeners = this._canvasConfiguredListeners.filter(l => l != listener);
	}

	public suggestOptimalCanvasSize(currentSize: Size): Size {
		return currentSize;
	}

	private _emitCanvasConfigured(): void {
		this._canvasConfiguredListeners.forEach(listener => listener.call(this));
	}

	private _createObserver(): ResizeObserver {
		const res = new ResizeObserver((entries: ResizeObserverEntry[]) => {
			const entry = entries.find((entry: ResizeObserverEntry) => entry.target === this.canvas);
			if (!entry || !entry.devicePixelContentBoxSize) {
				return;
			}
			const entrySize = entry.devicePixelContentBoxSize[0];
			this._pixelSize = {
				width: entrySize.inlineSize,
				height: entrySize.blockSize,
			}
			this.canvas.width = this._options.allowDownsampling ? entrySize.inlineSize : Math.max(entrySize.inlineSize, this._cssSize.width);
			this.canvas.height = this._options.allowDownsampling ? entrySize.blockSize  :Math.max(entrySize.blockSize, this._cssSize.height);
			this._emitCanvasConfigured();
		});
		res.observe(this.canvas, { box: 'device-pixel-content-box' });
		return res;
	}
}
