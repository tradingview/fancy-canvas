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

	suggestOptimalCanvasSize(currentSize: Size): Size;
}

export interface BindingOptions {
	allowDownsampling: boolean;
}
