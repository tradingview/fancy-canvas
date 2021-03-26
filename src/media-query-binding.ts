import { Binding, BindingOptions, CanvasConfiguredListener, Size } from 'coordinate-space';

export class MediaQueryBinding implements Binding {
	public readonly canvas: HTMLCanvasElement;
	private _canvasSize: Size;
	private _options: BindingOptions;
	private _resolutionMediaQueryList: MediaQueryList | null = null;
	private readonly _resolutionListener = (ev: MediaQueryListEvent) => this._onResolutionChanged();
	private _canvasConfiguredListeners: CanvasConfiguredListener[] = [];

	public constructor(canvas: HTMLCanvasElement, options: BindingOptions) {
		this.canvas = canvas;
		this._canvasSize = {
			width: this.canvas.clientWidth,
			height: this.canvas.clientHeight,
		};
		this._options = options;
		this._configureCanvas();
		this._installResolutionListener();
	}

	public destroy(): void {
		this._canvasConfiguredListeners.length = 0;
		this._uninstallResolutionListener();
		(this.canvas as any) = null;
	}

	public get canvasSize(): Size {
		return {
			width: this._canvasSize.width,
			height: this._canvasSize.height,
		};
	}

	public resizeCanvas(size: Size): void {
		this._canvasSize = {
			width: size.width,
			height: size.height,
		};
		this._configureCanvas();
	}

	public get pixelRatio(): number {
		// According to DOM Level 2 Core specification, ownerDocument should never be null for HTMLCanvasElement
		// see https://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#node-ownerDoc
		const win = this.canvas.ownerDocument!.defaultView;
		if (win == null) {
			throw new Error('No window is associated with the canvas');
		}

		return win.devicePixelRatio > 1 || this._options.allowDownsampling ? win.devicePixelRatio : 1;
	}

	public subscribeCanvasConfigured(listener: CanvasConfiguredListener): void {
		this._canvasConfiguredListeners.push(listener);
	}

	public unsubscribeCanvasConfigured(listener: CanvasConfiguredListener): void {
		this._canvasConfiguredListeners = this._canvasConfiguredListeners.filter(l => l != listener);
	}

	public suggestOptimalCanvasSize(currentSize: Size): Size {
		return {
			width: currentSize.width - currentSize.width % 2,
			height: currentSize.height - currentSize.height % 2,
		};
	}

	private _configureCanvas(): void {
		const ratio = this.pixelRatio;
		this.canvas.style.width = `${this._canvasSize.width}px`;
		this.canvas.style.height = `${this._canvasSize.height}px`;
		this.canvas.width = this._canvasSize.width * ratio;
		this.canvas.height = this._canvasSize.height * ratio;
		this._emitCanvasConfigured();
	}

	private _emitCanvasConfigured(): void {
		this._canvasConfiguredListeners.forEach(listener => listener.call(this));
	}

	private _installResolutionListener(): void {
		if (this._resolutionMediaQueryList !== null) {
			throw new Error('Resolution listener is already installed');
		}

		// According to DOM Level 2 Core specification, ownerDocument should never be null for HTMLCanvasElement
		// see https://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#node-ownerDoc
		const win = this.canvas.ownerDocument!.defaultView;
		if (win == null) {
			throw new Error('No window is associated with the canvas');
		}

		const dppx = win.devicePixelRatio;
		this._resolutionMediaQueryList = win.matchMedia(`all and (resolution: ${dppx}dppx)`);
		// IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
		this._resolutionMediaQueryList.addListener(this._resolutionListener);
	}

	private _uninstallResolutionListener(): void {
		if (this._resolutionMediaQueryList !== null) {
			// IE and some versions of Edge do not support addEventListener/removeEventListener, and we are going to use the deprecated addListener/removeListener
			this._resolutionMediaQueryList.removeListener(this._resolutionListener);
			this._resolutionMediaQueryList = null;
		}
	}

	private _reinstallResolutionListener(): void {
		this._uninstallResolutionListener();
		this._installResolutionListener();
	}

	private _onResolutionChanged(): void {
		this._configureCanvas();
		this._reinstallResolutionListener();
	}
}
