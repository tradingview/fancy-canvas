import {
	CanvasRenderingTarget2D,
	MediaCoordinatesRenderingScope,
} from 'fancy-canvas';

export interface Position {
	x: number;
	y: number;
}

export class BouncingBallRenderer {
	private readonly _color: string;
	private _position: Position | undefined;

	public constructor(color: string) {
		this._color = color;
	}

	public updatePos(position: Position) {
		this._position = position;
	}

	public draw(target: CanvasRenderingTarget2D): void {
		target.useMediaCoordinateSpace(
			(scope: MediaCoordinatesRenderingScope) => {
				scope.context.clearRect(
					0,
					0,
					scope.mediaSize.width,
					scope.mediaSize.height,
				);
				scope.context.beginPath();
				scope.context.arc(
					this._position?.x ?? 0,
					this._position?.y ?? 0,
					10,
					0,
					2 * Math.PI,
				);
				scope.context.fillStyle = this._color;
				scope.context.fill();
			},
		);
	}
}
