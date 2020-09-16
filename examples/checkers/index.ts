import { Size, Binding } from 'fancy-canvas/coordinate-space';
import { CanvasBindingFactory, createCanvasBindingFactory } from 'fancy-canvas/binding-factory';

let cnv0: HTMLCanvasElement | null = null;
let cnv1: HTMLCanvasElement | null = null;
let cnv2: HTMLCanvasElement | null = null;
let binding1: Binding | null = null;
let binding2: Binding | null = null;
window.onload = () => {
	createCanvasBindingFactory(true).then((factory: CanvasBindingFactory) => {
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
				binding1 = factory(c);
				// Don't forget to unsubscribe if you are going to destroy binding or canvas
				// not sure why do we need this if. Looks like compiler bug
				if (binding1 !== null) {
					binding1.subscribeCanvasConfigured(() => {
						window.requestAnimationFrame(renderFrame);
						(document.getElementById("header") as HTMLHeadingElement).innerText = `DRP: ${binding1?.pixelRatio}`;
					});
				}
				(document.getElementById("header") as HTMLHeadingElement).innerText = `DRP: ${binding1?.pixelRatio}`;
			}

		}

		{
			const c = document.getElementById("cnv2");
			if (c instanceof HTMLCanvasElement) {
				cnv2 = c;
				binding2 = factory(c);
				// Don't forget to unsubscribe if you are going to destroy binding or canvas
				// not sure why do we need this if. Looks like compiler bug
				if (binding2 !== null) {
					binding2.subscribeCanvasConfigured(() => {
						window.requestAnimationFrame(renderFrame);
					});
				}
			}
		}

		window.requestAnimationFrame(renderFrame);
	});
};

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

		drawScene(ctx, { width: ctx.canvas.width, height: ctx.canvas.height }, 1);
	}

	{
		const ctx = cnv1.getContext("2d");
		if (ctx === null) {
			return;
		}

		drawScene(ctx, binding1.canvasSize, binding1.pixelRatio);
	}

	{
		const ctx = cnv2.getContext("2d");
		if (ctx === null) {
			return;
		}

		drawGrid(ctx, binding2.canvasSize, binding2.pixelRatio);
	}
}

function drawGrid(ctx: CanvasRenderingContext2D, canvasSize: Size, pixelRatio: number) {
	ctx.fillStyle = "yellow";
	ctx.fillRect(0, 0, Math.ceil(canvasSize.width * pixelRatio), Math.ceil(canvasSize.height * pixelRatio));

	ctx.strokeStyle = "black";
	ctx.lineWidth = Math.max(1, Math.floor(pixelRatio));
	const count = 10;
	const a = 20;
	const offset = (ctx.lineWidth % 2) ? 0.5 : 0;
	ctx.beginPath();
	for (let y = 0; y < count; y++) {
		const r = Math.round(y * a * pixelRatio) + offset;
		ctx.moveTo(0, r);
		ctx.lineTo(Math.ceil(canvasSize.width * pixelRatio), r);
	}
	ctx.stroke();
	ctx.beginPath();
	for (let x = 0; x < count; x++) {
		const r = Math.round(x * a * pixelRatio) + offset;
		ctx.moveTo(r, 0);
		ctx.lineTo(r, Math.ceil(canvasSize.height * pixelRatio));
	}
	ctx.stroke();
}

function drawScene(ctx: CanvasRenderingContext2D, canvasSize: Size, pixelRatio: number) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, Math.ceil(canvasSize.width * pixelRatio), Math.ceil(canvasSize.height * pixelRatio));

	const count = 10;
	for (let x = 0; x < count; x++) {
		for (let y = 0; y < count; y++) {
			if ((x + y) % 2 === 0) {
				const a = 20;
				ctx.fillStyle = `rgba(${Math.round(x * 255 / count)}, ${Math.round(y * 255 / count)}, 0, 255)`;
				const left = Math.round((x * a + offset.x) * pixelRatio);
				const top = Math.round((y * a + offset.y) * pixelRatio);
				const size = Math.round(a * pixelRatio);
				ctx.fillRect(left, top, size, size);
			}
		}
	}
	ctx.font = "40px arial";
	ctx.fillStyle = "white";
	const text = "You win!";
	const textMetrics = ctx.measureText(text);
	ctx.save();
	ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	ctx.fillText(
		"You win!",
		canvasSize.width / 2 - textMetrics.width / 2 + offset.x,
		canvasSize.height / 2 + offset.y,
	);
	ctx.restore();
}
