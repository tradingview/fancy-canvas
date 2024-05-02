import {
	CanvasElementBitmapSizeBinding,
	createCanvasRenderingTarget2D,
	Size,
} from 'fancy-canvas';
import { BouncingBallRenderer, Position } from './bouncing-ball-renderer.js';

type Canvas = CanvasElementBitmapSizeBinding<boolean>['canvas'];

export class BouncingBallModel {
	private readonly _canvas: Canvas;
	private readonly _color: string;
	private _running: boolean = false;
	private _size: Size;
	private _mediaSize: Size;
	private _renderer: BouncingBallRenderer;
	private _position: Position = {
		x: 10,
		y: 10,
	};
	private _velocity: Position = {
		x: 10,
		y: 5,
	};

	public constructor(
		canvas: Canvas,
		color: string,
		size: Size,
		mediaSize: Size
	) {
		this._canvas = canvas;
		this._color = color;
		this._size = size;
		this._mediaSize = mediaSize;
		this._renderer = new BouncingBallRenderer(this._color);
		this.start();
	}

	public updateSize(
		size: Size,
		mediaSize: Size,
		isOffscreen?: boolean
	): void {
		this._size = size;
		this._mediaSize = mediaSize;
		if (isOffscreen) {
			(this._canvas as OffscreenCanvas).height = size.height;
			(this._canvas as OffscreenCanvas).width = size.width;
		}
	}

	public start(): void {
		this._running = true;
		this._animate();
	}

	public stop(): void {
		this._running = false;
	}

	private _animate(): void {
		const newPos: Position = {
			x: this._position.x + this._velocity.x,
			y: this._position.y + this._velocity.y,
		};
		if (newPos.x <= 10 || newPos.x >= this._mediaSize.width - 10) {
			this._velocity.x *= -1;
			newPos.x = Math.min(
				Math.max(10, newPos.x),
				this._mediaSize.width - 10
			);
		}
		if (newPos.y <= 10 || newPos.y >= this._mediaSize.height - 10) {
			this._velocity.y *= -1;
			newPos.y = Math.min(
				Math.max(10, newPos.y),
				this._mediaSize.height - 10
			);
		}
		const target = createCanvasRenderingTarget2D({
			get2DContext: options => this._canvas.getContext('2d', options),
			bitmapSize: this._size,
			canvasElementClientSize: this._mediaSize,
		});
		this._renderer.updatePos(newPos);
		this._renderer.draw(target);
		this._position = newPos;
		if (this._running) {
			requestAnimationFrame(this._animate.bind(this));
		}
	}
}
