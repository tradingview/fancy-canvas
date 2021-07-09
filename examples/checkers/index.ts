import { Size, CanvasElementBitmapSizeBinding, bindCanvasElementBitmapSizeTo } from 'fancy-canvas';

class RenderParams {
	public readonly canvasElementClientSize: Readonly<Size>;
	public readonly bitmapSize: Readonly<Size>;

	public constructor(canvasElementClientSize: Size, bitmapSize: Size) {
		this.canvasElementClientSize = canvasElementClientSize;
		this.bitmapSize = bitmapSize;
	}

	public get horizontalPixelRatio(): number {
		return this.bitmapSize.width / this.canvasElementClientSize.width;
	}

	public get verticalPixelRatio(): number {
		return this.bitmapSize.height / this.canvasElementClientSize.height;
	}
}

function getRenderParams(binding: CanvasElementBitmapSizeBinding): RenderParams {
	return new RenderParams(binding.canvasElementClientSize, binding.bitmapSize);
}

let cnv0: HTMLCanvasElement | null = null;
let cnv1: HTMLCanvasElement | null = null;
let cnv2: HTMLCanvasElement | null = null;
let binding1: CanvasElementBitmapSizeBinding | null = null;
let binding2: CanvasElementBitmapSizeBinding | null = null;
window.onload = () => {
	{
		const c = document.getElementById("cnv0");
		if (c instanceof HTMLCanvasElement) {
			cnv0 = c;
			cnv0.width = cnv0.style.width !== null ? parseInt(cnv0.style.width) : 0;
			cnv0.height = cnv0.style.height !== null ? parseInt(cnv0.style.height) : 0;
		}
	}

	{
		const c = document.getElementById("cnv1");
		if (c instanceof HTMLCanvasElement) {
			cnv1 = c;
			binding1 = bindCanvasElementBitmapSizeTo(c, { type: 'device-pixel-content-box' });
			// Don't forget to unsubscribe if you are going to destroy binding or canvas
			// not sure why do we need this if. Looks like compiler bug
			if (binding1 !== null) {
				binding1.subscribeBitmapSizeChanged(() => {
					window.requestAnimationFrame(renderFrame);
					updatePixelRatioText(binding1);
				});
			}
			updatePixelRatioText(binding1);
		}

	}

	{
		const c = document.getElementById("cnv2");
		if (c instanceof HTMLCanvasElement) {
			cnv2 = c;
			binding2 = bindCanvasElementBitmapSizeTo(c, { type: 'device-pixel-content-box' });
			// Don't forget to unsubscribe if you are going to destroy binding or canvas
			// not sure why do we need this if. Looks like compiler bug
			if (binding2 !== null) {
				binding2.subscribeBitmapSizeChanged(() => {
					window.requestAnimationFrame(renderFrame);
				});
			}
		}
	}

	window.requestAnimationFrame(renderFrame);
};

type Point = { x: number, y: number };
let originalPoint: Point | null = null;
const offset: Point = { x: 0, y: 0 };
window.onmousedown = (ev: MouseEvent) => {
	originalPoint = { x: ev.clientX, y: ev.clientY };
}
window.onmousemove = (ev: MouseEvent) => {
	if (originalPoint === null || ev.buttons === 0) {
		return;
	}

	offset.x += ev.clientX - originalPoint.x;
	offset.y += ev.clientY - originalPoint.y;
	originalPoint = { x: ev.clientX, y: ev.clientY };

	window.requestAnimationFrame(renderFrame);
}

function renderFrame() {
	if (cnv0 === null || cnv1 === null || cnv2 === null || binding1 === null || binding2 === null) {
		return;
	}

	{
		const ctx = cnv0.getContext('2d');
		if (ctx === null) {
			return;
		}

		const cnv0Size = { width: cnv0.width, height: cnv0.height };
		drawScene(ctx, new RenderParams(cnv0Size, cnv0Size));
	}

	{
		const ctx = cnv1.getContext("2d");
		if (ctx === null) {
			return;
		}

		drawScene(ctx, getRenderParams(binding1));
	}

	{
		const ctx = cnv2.getContext("2d");
		if (ctx === null) {
			return;
		}

		drawGrid(ctx, getRenderParams(binding2));
	}
}

function drawGrid(ctx: CanvasRenderingContext2D, renderParams: RenderParams) {
	ctx.fillStyle = "yellow";
	ctx.fillRect(0, 0, renderParams.bitmapSize.width, renderParams.bitmapSize.height);

	ctx.strokeStyle = "black";
	ctx.lineWidth = Math.max(1, Math.floor(renderParams.horizontalPixelRatio));
	const count = 10;
	const a = 20;
	const offset = (ctx.lineWidth % 2) ? 0.5 : 0;
	ctx.beginPath();
	for (let y = 0; y < count; y++) {
		const r = Math.round(y * a * renderParams.verticalPixelRatio) + offset;
		ctx.moveTo(0, r);
		ctx.lineTo(renderParams.bitmapSize.width, r);
	}
	ctx.stroke();
	ctx.beginPath();
	for (let x = 0; x < count; x++) {
		const r = Math.round(x * a * renderParams.horizontalPixelRatio) + offset;
		ctx.moveTo(r, 0);
		ctx.lineTo(r, renderParams.bitmapSize.height);
	}
	ctx.stroke();
}

function drawScene(ctx: CanvasRenderingContext2D, renderParams: RenderParams) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, renderParams.bitmapSize.width, renderParams.bitmapSize.height);

	const count = 10;
	for (let x = 0; x < count; x++) {
		for (let y = 0; y < count; y++) {
			if ((x + y) % 2 === 0) {
				const a = 20;
				ctx.fillStyle = `rgba(${Math.round(x * 255 / count)}, ${Math.round(y * 255 / count)}, 0, 255)`;
				const left = Math.round((x * a + offset.x) * renderParams.horizontalPixelRatio);
				const top = Math.round((y * a + offset.y) * renderParams.verticalPixelRatio);
				const width = Math.round(a * renderParams.horizontalPixelRatio);
				const height = Math.round(a * renderParams.verticalPixelRatio);
				ctx.fillRect(left, top, width, height);
			}
		}
	}

	ctx.font = "40px arial";
	ctx.fillStyle = "white";
	const text = "You win!";
	const textMetrics = ctx.measureText(text);
	ctx.save();
	ctx.setTransform(renderParams.horizontalPixelRatio, 0, 0, renderParams.verticalPixelRatio, 0, 0);
	ctx.fillText(
		"You win!",
		renderParams.canvasElementClientSize.width / 2 - textMetrics.width / 2 + offset.x,
		renderParams.canvasElementClientSize.height / 2 + offset.y,
	);
	ctx.restore();
}

function updatePixelRatioText(binding: CanvasElementBitmapSizeBinding | null): void {
	if (binding !== null) {
		const renderParams = getRenderParams(binding);
		(document.getElementById("header") as HTMLHeadingElement).innerText = `Pixel ratio: ${renderParams.horizontalPixelRatio} ⨯ ${renderParams.verticalPixelRatio}`;
	} else {
		(document.getElementById("header") as HTMLHeadingElement).innerText = 'Binding does not exist';
	}
}
