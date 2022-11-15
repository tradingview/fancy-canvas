import {
	bindCanvasElementBitmapSizeTo,
	CanvasElementBitmapSizeBinding,
	size,
	CanvasRenderingTarget2D,
	createCanvasRenderingTarget2D,
	tryCreateCanvasRenderingTarget2D,
	BitmapCoordinatesRenderingScope,
} from 'fancy-canvas';

let cnv0: HTMLCanvasElement | null = null;
let cnv1: HTMLCanvasElement | null = null;
let cnv2: HTMLCanvasElement | null = null;
let binding1: CanvasElementBitmapSizeBinding | null = null;
let binding2: CanvasElementBitmapSizeBinding | null = null;
window.onload = () => {
	{
		const c = document.getElementById('cnv0');
		if (c instanceof HTMLCanvasElement) {
			cnv0 = c;
			cnv0.width = cnv0.style.width !== null ? parseInt(cnv0.style.width) : 0;
			cnv0.height = cnv0.style.height !== null ? parseInt(cnv0.style.height) : 0;
		}
	}

	{
		const c = document.getElementById('cnv1');
		if (c instanceof HTMLCanvasElement) {
			cnv1 = c;
			binding1 = bindCanvasElementBitmapSizeTo(c, { type: 'device-pixel-content-box' });
			// Don't forget to unsubscribe if you are going to destroy binding or canvas
			// not sure why do we need this if. Looks like compiler bug
			if (binding1 !== null) {
				binding1.subscribeSuggestedBitmapSizeChanged(() => {
					window.requestAnimationFrame(renderFrame);
					if (binding1 === null) {
						return;
					}
					updatePixelRatioText(tryCreateCanvasRenderingTarget2D(binding1));
				});
				updatePixelRatioText(tryCreateCanvasRenderingTarget2D(binding1));
			}
		}

	}

	{
		const c = document.getElementById('cnv2');
		if (c instanceof HTMLCanvasElement) {
			cnv2 = c;
			binding2 = bindCanvasElementBitmapSizeTo(c, { type: 'device-pixel-content-box' });
			// Don't forget to unsubscribe if you are going to destroy binding or canvas
			// not sure why do we need this if. Looks like compiler bug
			if (binding2 !== null) {
				binding2.subscribeSuggestedBitmapSizeChanged(() => {
					window.requestAnimationFrame(renderFrame);
				});
			}
		}
	}

	window.requestAnimationFrame(renderFrame);
};

type Point = {
	x: number;
	y: number;
};
let originalPoint: Point | null = null;
const offset: Point = {
	x: 0,
	y: 0,
};

window.onmousedown = (ev: MouseEvent) => {
	originalPoint = {
		x: ev.clientX,
		y: ev.clientY,
	};
};

window.onmousemove = (ev: MouseEvent) => {
	if (originalPoint === null || ev.buttons === 0) {
		return;
	}

	offset.x += ev.clientX - originalPoint.x;
	offset.y += ev.clientY - originalPoint.y;
	originalPoint = {
		x: ev.clientX,
		y: ev.clientY,
	};

	window.requestAnimationFrame(renderFrame);
};

function renderFrame() {
	if (cnv0 === null || cnv1 === null || cnv2 === null || binding1 === null || binding2 === null) {
		return;
	}

	{
		const ctx = cnv0.getContext('2d');
		if (ctx === null) {
			return;
		}

		const cnv0Size = size({
			width: cnv0.width,
			height: cnv0.height,
		});
		const target = new CanvasRenderingTarget2D(ctx, cnv0Size, cnv0Size);
		drawScene(target);
	}

	{
		if (binding1.suggestedBitmapSize !== null) {
			binding1.applySuggestedBitmapSize();
		}

		const target = createCanvasRenderingTarget2D(binding1);
		drawScene(target);
	}

	{
		if (binding2.suggestedBitmapSize !== null) {
			binding2.applySuggestedBitmapSize();
		}

		const target = tryCreateCanvasRenderingTarget2D(binding2);
		if (target === null) {
			return;
		}

		target.useBitmapCoordinateSpace(drawGrid);
	}
}

function drawGrid({ context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio }: BitmapCoordinatesRenderingScope) {
	ctx.fillStyle = 'yellow';
	ctx.fillRect(0, 0, bitmapSize.width, bitmapSize.height);

	ctx.strokeStyle = 'black';
	ctx.lineWidth = Math.max(1, Math.floor(horizontalPixelRatio));
	const count = 10;
	const a = 20;
	const offset = (ctx.lineWidth % 2) ? 0.5 : 0;
	ctx.beginPath();
	for (let y = 0; y < count; y++) {
		const r = Math.round(y * a * verticalPixelRatio) + offset;
		ctx.moveTo(0, r);
		ctx.lineTo(bitmapSize.width, r);
	}
	ctx.stroke();
	ctx.beginPath();
	for (let x = 0; x < count; x++) {
		const r = Math.round(x * a * horizontalPixelRatio) + offset;
		ctx.moveTo(r, 0);
		ctx.lineTo(r, bitmapSize.height);
	}
	ctx.stroke();
}

function drawScene(target: CanvasRenderingTarget2D) {
	target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio }) => {
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, bitmapSize.width, bitmapSize.height);
	
		const count = 10;
		for (let x = 0; x < count; x++) {
			for (let y = 0; y < count; y++) {
				if ((x + y) % 2 === 0) {
					const a = 20;
					ctx.fillStyle = `rgba(${Math.round(x * 255 / count)}, ${Math.round(y * 255 / count)}, 0, 255)`;
					const left = Math.round((x * a + offset.x) * horizontalPixelRatio);
					const top = Math.round((y * a + offset.y) * verticalPixelRatio);
					const width = Math.round(a * horizontalPixelRatio);
					const height = Math.round(a * verticalPixelRatio);
					ctx.fillRect(left, top, width, height);
				}
			}
		}
	});

	target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
		ctx.font = '40px arial';
		ctx.fillStyle = 'white';
		const text = 'You win!';
		const textMetrics = ctx.measureText(text);
		ctx.fillText(
			'You win!',
			mediaSize.width / 2 - textMetrics.width / 2 + offset.x,
			mediaSize.height / 2 + offset.y,
		);
	});
}

function updatePixelRatioText(target: CanvasRenderingTarget2D | null): void {
	if (target !== null) {
		target.useBitmapCoordinateSpace(({ horizontalPixelRatio, verticalPixelRatio }) => {
			(document.getElementById('header') as HTMLHeadingElement).innerText = `Pixel ratio: ${horizontalPixelRatio} ⨯ ${verticalPixelRatio}`;
		});
	} else {
		(document.getElementById('header') as HTMLHeadingElement).innerText = 'Rendering target does not exist';
	}
}
