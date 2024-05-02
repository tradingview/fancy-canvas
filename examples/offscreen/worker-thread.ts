import { Size } from 'fancy-canvas';
import { BouncingBallModel } from './bouncing-ball-model.js';

export class WorkerHandler {
	private _model: BouncingBallModel | undefined;

	constructor() {
		self.addEventListener('message', this.onMessage.bind(this));
	}

	private onMessage(e: MessageEvent): void {
		const { type, data } = e.data;

		switch (type) {
		case 'create-canvas':
			this._create(data);
			break;
		case 'adjust-canvas-size':
			this._adjustSize(data);
			break;
		case 'start':
			this._start();
			break;
		case 'pause':
			this._pause();
			break;
		default:
			console.warn(`Unknown message type: ${type}`);
		}
	}

	private _create(data: CreateWorkerMessageData): void {
		this._model = new BouncingBallModel(
			data.canvas,
			data.color,
			data.bitmapSize,
			data.canvasElementClientSize,
		);
		self.postMessage('created');
	}

	private _adjustSize(data: AdjustCanvasSizeMessage): void {
		this._model?.updateSize(data.bitmapSize, data.canvasElementClientSize, true);
	}

	private _start(): void {
		this._model?.start();
	}

	private _pause(): void {
		this._model?.stop();
	}
}

export interface CreateWorkerMessageData {
	canvas: OffscreenCanvas;
	color: string;
	bitmapSize: Size;
	canvasElementClientSize: Size;
}

export interface AdjustCanvasSizeMessage {
	bitmapSize: Size;
	canvasElementClientSize: Size;
}

// self-start
// eslint-disable-next-line no-new
new WorkerHandler();
