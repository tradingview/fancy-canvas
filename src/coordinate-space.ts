export type Size = {
	width: number;
	height: number;
}

export interface Binding {
	destroy(): void;

	/**
	 * Canvas element size in CSS pixels
	*/
	canvasSize: Size;
	pixelRatio: number;
}

export function bindToDevicePixelRatio(canvas: HTMLCanvasElement): Binding {
	return new DevicePixelRatioBinding(canvas);
}

class DevicePixelRatioBinding implements Binding {
	private _canvas: HTMLCanvasElement;
	private _canvasSize: Size;
	private _resolutionMediaQueryList: MediaQueryList | null = null;
	private _resolutionListener = (ev: MediaQueryListEvent) => this._onResolutionChanged();
	
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
		this._uninstallResolutionListener();
		(this._canvasSize as any) = null;
		(this._canvas as any) = null;
	}
	
	public get canvasSize(): Size {
		return this._canvasSize;
	}

	public set canvasSize(size: Size) {
		this._canvasSize = size;
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

	private _configureCanvas(): void {
		const ratio = this.pixelRatio;
		this._canvas.style.width = `${this._canvasSize.width}px`;
		this._canvas.style.height = `${this._canvasSize.height}px`;
		this._canvas.width = this._canvasSize.width * ratio;
		this._canvas.height = this._canvasSize.height * ratio;
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
		const dpi = dppx * 96;
		this._resolutionMediaQueryList = window.matchMedia(`screen and (min-resolution: ${dpi - 0.001}dpi) and (max-resolution: ${dpi + 0.001}dpi)`);
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
