import { Size, Binding, bindToDevicePixelRatio } from 'fancy-canvas/coordinate-space';

let cnv0: HTMLCanvasElement | null = null;
let cnv1: HTMLCanvasElement | null = null;
let binding1: Binding | null = null;
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
			binding1 = bindToDevicePixelRatio(c);
		}
	}

	window.requestAnimationFrame(renderFrame);
}

type Point = { x: number, y: number };
let originalPoint: Point | null = null;
let offset: Point = { x: 0, y: 0 };
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
}

function renderFrame() {
	if (cnv0 === null || cnv1 === null ||
		binding1 === null) {
		return;
	}

	{
		const ctx = cnv0.getContext('2d');
		if (ctx === null) {
			return;
		}

		drawScene(ctx, { width: ctx.canvas.width, height: ctx.canvas.height });
	}

	{
		const ctx = cnv1.getContext("2d");
		if (ctx === null) {
			return;
		}
		ctx.setTransform(binding1.pixelRatio, 0, 0, binding1.pixelRatio, 0, 0);

		drawScene(ctx, binding1.canvasSize);
	}

	window.requestAnimationFrame(renderFrame);
}

function drawScene(ctx: CanvasRenderingContext2D, canvasSize: Size) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

	const count = 10;
	for (let x = 0; x < count; x++) {
		for (let y = 0; y < count; y++) {
			if ((x + y) % 2 === 0) {
				const a = 20;
				ctx.fillStyle = `rgba(${Math.round(x * 255 / count)}, ${Math.round(y * 255 / count)}, 0, 255)`;
				ctx.fillRect(x * a + offset.x, y * a + offset.y, a, a);
			}
		}
	}
	ctx.font = "40px arial";
	ctx.fillStyle = "white";
	const text = "You win!";
	const textMetrics = ctx.measureText(text);
	ctx.fillText(
		"You win!",
		canvasSize.width / 2 - textMetrics.width / 2 + offset.x,
		canvasSize.height / 2 + offset.y
	);
}
