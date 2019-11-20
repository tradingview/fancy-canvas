export type Size = {
	width: number;
	height: number;
}

export type CanvasConfiguredListener = (this: Binding) => void;

export interface Binding {
	destroy(): void;

	readonly canvas: HTMLCanvasElement;
	/**
	 * Canvas element size in CSS pixels
	*/
	readonly canvasSize: Size;
	resizeCanvas(size: Size): void;
	readonly pixelRatio: number;

	subscribeCanvasConfigured(listener: CanvasConfiguredListener): void;
	unsubscribeCanvasConfigured(listener: CanvasConfiguredListener): void;
}

export function bindToDevicePixelRatio(canvas: HTMLCanvasElement): Binding {
	return new DevicePixelRatioBinding(canvas);
}

class DevicePixelRatioBinding implements Binding {
	private readonly _canvas: HTMLCanvasElement;
	private _canvasSize: Size;
	private _resolutionMediaQueryList: MediaQueryList | null = null;
	private readonly _resolutionListener = (ev: MediaQueryListEvent) => this._onResolutionChanged();
	private _canvasConfiguredListeners: CanvasConfiguredListener[] = [];

	public constructor(canvas: HTMLCanvasElement) {
		this._canvas = canvas;
		this._canvasSize = {
			width: this._canvas.clientWidth,
			height: this._canvas.clientHeight,
		};
		this._configureCanvas();
		this._installResolutionListener();
	}

	public destroy(): void {
		this._canvasConfiguredListeners.length = 0;
		this._uninstallResolutionListener();
		(this._canvas as any) = null;
	}

	public get canvas(): HTMLCanvasElement {
		return this._canvas;
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
		if (this._canvas.ownerDocument == null) {
			throw new Error('Invalid owner document specified for canvas');
		}

		const window = this._canvas.ownerDocument.defaultView;
		if (window == null) {
			throw new Error('No window is associated with the canvas');
		}

		return window.devicePixelRatio;
	}

	public subscribeCanvasConfigured(listener: CanvasConfiguredListener): void {
		this._canvasConfiguredListeners.push(listener);
	}

	public unsubscribeCanvasConfigured(listener: CanvasConfiguredListener): void {
		this._canvasConfiguredListeners = this._canvasConfiguredListeners.filter(l => l != listener);
	}

	private _configureCanvas(): void {
		const ratio = this.pixelRatio;
		this._canvas.style.width = `${this._canvasSize.width}px`;
		this._canvas.style.height = `${this._canvasSize.height}px`;
		this._canvas.width = this._canvasSize.width * ratio;
		this._canvas.height = this._canvasSize.height * ratio;
		this._emitCanvasConfigured();
	}

	private _emitCanvasConfigured(): void {
		this._canvasConfiguredListeners.forEach(listener => listener.call(this));
	}

	private _installResolutionListener(): void {
		if (this._resolutionMediaQueryList !== null) {
			throw new Error('Resolution listener is already installed');
		}

		if (this._canvas.ownerDocument == null) {
			throw new Error('Invalid owner document specified for canvas');
		}

		const window = this._canvas.ownerDocument.defaultView;
		if (window == null) {
			throw new Error('No window is associated with the canvas');
		}

		const dppx = window.devicePixelRatio;
		this._resolutionMediaQueryList = window.matchMedia(`all and (resolution: ${dppx}dppx)`);
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
