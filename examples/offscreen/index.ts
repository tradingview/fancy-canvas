import {
	bindCanvasElementBitmapSizeTo,
	CanvasElementBitmapSizeBinding,
	Size,
} from 'fancy-canvas';
import { BouncingBallModel } from './bouncing-ball-model.js';
import {
	AdjustCanvasSizeMessage,
	CreateWorkerMessageData,
} from './worker-thread.js';

class BouncingBall<T extends boolean> {
	private readonly _canvasHTMLElement: HTMLCanvasElement;
	private readonly _color: string;
	private readonly _offscreen: T;
	private readonly _worker: boolean;
	private readonly _binding: CanvasElementBitmapSizeBinding<T>;
	private _model: BouncingBallModel | undefined = undefined;
	private _workerThread: Worker | undefined;

	public constructor(
		container: HTMLCanvasElement,
		color: string,
		offscreen: T,
		worker: boolean
	) {
		this._canvasHTMLElement = container;
		this._color = color;
		this._offscreen = offscreen;
		this._worker = worker;
		this._binding = bindCanvasElementBitmapSizeTo(this._canvasHTMLElement, {
			type: 'device-pixel-content-box',
			options: {
				allowResizeObserver: true,
				allowOffscreenCanvas: this._offscreen,
			},
			setOffscreenCanvasSize: this._updateOffscreenCanvasSize.bind(this),
		}) as CanvasElementBitmapSizeBinding<T>;
		this._binding.subscribeSuggestedBitmapSizeChanged(() => {
			this._binding.applySuggestedBitmapSize();
		});
		if (this._worker) {
			this._createModelWorkerThread();
		} else {
			this._createModelMainThread();
		}
		const resizeObserver = new ResizeObserver(entries => {
			for (const entry of entries) {
				const { width } = entry.contentRect;
				this._binding.resizeCanvasElement({
					height: 150, // fixed height
					width,
				});
			}
		});
		const parent = this._canvasHTMLElement.parentElement;
		if (parent) {
			resizeObserver.observe(parent);
		}
	}

	public start(): void {
		if (this._workerThread) {
			this._workerThread.postMessage({
				type: 'start',
			});
			return;
		}
		this._model?.start();
	}

	public pause(): void {
		if (this._workerThread) {
			this._workerThread.postMessage({
				type: 'pause',
			});
			return;
		}
		this._model?.stop();
	}

	private _createModelMainThread(): void {
		this._model = new BouncingBallModel(
			this._binding.canvas,
			this._color,
			this._binding.bitmapSize,
			this._binding.canvasElementClientSize
		);
		this._binding.subscribeBitmapSizeChanged(
			(_oldSize: Size, newSize: Size) => {
				this._model?.updateSize(
					newSize,
					this._binding.canvasElementClientSize
				);
			}
		);
	}

	private _createModelWorkerThread(): void {
		this._workerThread = new Worker('./worker-thread.js');
		const offscreenCanvas = this._binding.requestOffscreenCanvas();
		if (offscreenCanvas) {
			this._workerThread.postMessage(
				{
					type: 'create-canvas',
					data: {
						canvas: offscreenCanvas,
						color: this._color,
						bitmapSize: this._binding.bitmapSize,
						canvasElementClientSize:
							this._binding.canvasElementClientSize,
					} satisfies CreateWorkerMessageData,
				},
				[offscreenCanvas]
			);
		}
	}

	private _updateOffscreenCanvasSize(bitmapSize: Size): void {
		if (!this._workerThread) {
			return;
		}
		this._workerThread.postMessage({
			type: 'adjust-canvas-size',
			data: {
				bitmapSize,
				canvasElementClientSize: this._binding.canvasElementClientSize,
			} satisfies AdjustCanvasSizeMessage,
		});
	}
}

const disabledCanvas = document.querySelector<HTMLCanvasElement>(
	'#offscreen-canvas-disabled'
);
const mainCanvas = document.querySelector<HTMLCanvasElement>(
	'#offscreen-canvas-main'
);
const workerCanvas = document.querySelector<HTMLCanvasElement>(
	'#offscreen-canvas-worker'
);
const startButton = document.querySelector<HTMLButtonElement>('#start-button');
const pauseButton = document.querySelector<HTMLButtonElement>('#pause-button');
const taskButton = document.querySelector<HTMLButtonElement>('#task-button');

if (
	disabledCanvas &&
	mainCanvas &&
	workerCanvas &&
	startButton &&
	pauseButton &&
	taskButton
) {
	const disabledBall = new BouncingBall(
		disabledCanvas,
		'#F23645',
		false,
		false
	);
	const mainBall = new BouncingBall(mainCanvas, '#2962ff', true, false);
	const workerBall = new BouncingBall(workerCanvas, '#089981', true, true);
	startButton.addEventListener('click', () => {
		disabledBall.start();
		mainBall.start();
		workerBall.start();
	});
	pauseButton.addEventListener('click', () => {
		disabledBall.pause();
		mainBall.pause();
		workerBall.pause();
	});
	taskButton.addEventListener('click', () => {
		const start = Date.now();
		while (Date.now() - start < 1000) {
			for (let i = 0; i < 100000; i++) {
				(window as unknown as any).num = Math.random() * Math.random();
			}
		}
	});
}
