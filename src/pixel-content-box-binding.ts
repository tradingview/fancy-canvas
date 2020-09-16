import { Binding, BindingOptions, CanvasConfiguredListener, Size } from 'coordinate-space';

export class PixelContentBoxDevicePixelRatioBinding implements Binding {
    public readonly canvas: HTMLCanvasElement;
    private _canvasSize: Size;
    private _physicalSize: Size;
    private _options: BindingOptions;
    private _canvasConfiguredListeners: CanvasConfiguredListener[] = [];
    private _observer!: ResizeObserver;

    public constructor(canvas: HTMLCanvasElement, options: BindingOptions) {
        this.canvas = canvas;
        this._canvasSize = {
            width: this.canvas.clientWidth,
            height: this.canvas.clientHeight,
        };
        this._physicalSize = this._canvasSize;
        this._options = options;
        this._installObserver();
        this._configureCanvas();
    }

    public destroy(): void {
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
        const result = (this._canvasSize.width > 0) ? this._physicalSize.width / this._canvasSize.width : 1;
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

    private _configureCanvas(): void {
        //const ratio = this.pixelRatio;
        this.canvas.style.width = `${this._canvasSize.width}px`;
        this.canvas.style.height = `${this._canvasSize.height}px`;
    }

    private _emitCanvasConfigured(): void {
        this._canvasConfiguredListeners.forEach(listener => listener.call(this));
    }

    private _installObserver(): void {
        this._observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            const entry = entries.find((entry: ResizeObserverEntry) => entry.target === this.canvas);
            if (!entry || !entry.devicePixelContentBoxSize) {
                return;
            }
            const entrySize = entry.devicePixelContentBoxSize[0];
            this._physicalSize = {
                width: entrySize.inlineSize,
                height: entrySize.blockSize,
            }
            this.canvas.width = entrySize.inlineSize;
            this.canvas.height = entrySize.blockSize;
            this._emitCanvasConfigured();
        });
        this._observer.observe(this.canvas, { box: 'device-pixel-content-box' });
    }
}
