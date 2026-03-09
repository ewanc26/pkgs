/**
 * @ewanc26/noise-avatar
 *
 * Deterministic value-noise avatar generation.
 *
 * Renders a unique, colour-rich noise texture onto an HTMLCanvasElement
 * from an arbitrary string seed. The same seed always produces the same image.
 * Zero runtime dependencies; works in any environment with a Canvas API.
 */

// ─── Hash ────────────────────────────────────────────────────────────────────

/**
 * djb2 hash — returns an unsigned 32-bit integer for any string.
 */
export function hash32(str: string): number {
	let h = 5381;
	for (let i = 0; i < str.length; i++) h = Math.imul(33, h) ^ str.charCodeAt(i);
	return h >>> 0;
}

// ─── PRNG ────────────────────────────────────────────────────────────────────

/**
 * Seeded LCG pseudo-random number generator.
 * Returns a function that produces floats in [0, 1).
 */
export function makePrng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(1664525, s) + 1013904223) >>> 0;
		return s / 0x100000000;
	};
}

// ─── Colour ──────────────────────────────────────────────────────────────────

/**
 * Convert HSL (each component in [0, 1]) to an RGB triple ([0, 255] each).
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h * 12) % 12;
		return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
	};
	return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// ─── Noise ───────────────────────────────────────────────────────────────────

function smoothstep(t: number): number {
	return t * t * (3 - 2 * t);
}

/**
 * Options for `renderNoiseAvatar`.
 */
export interface NoiseAvatarOptions {
	/**
	 * Side length of the internal noise grid (higher = more detail).
	 * @default 5
	 */
	gridSize?: number;
	/**
	 * Width and height of the rendered canvas in pixels.
	 * @default 64
	 */
	displaySize?: number;
	/**
	 * Hue spread (degrees) around the seed-derived base hue.
	 * @default 60
	 */
	hueRange?: number;
	/**
	 * Saturation range [min, max] as percentages.
	 * @default [45, 70]
	 */
	saturationRange?: [number, number];
	/**
	 * Lightness range [min, max] as percentages.
	 * @default [40, 70]
	 */
	lightnessRange?: [number, number];
}

/**
 * Render a deterministic value-noise avatar onto `canvas`.
 *
 * @param canvas  Target HTMLCanvasElement (will be resized to `displaySize`).
 * @param seed    Arbitrary string — same seed always produces the same image.
 * @param options Rendering options.
 */
export function renderNoiseAvatar(
	canvas: HTMLCanvasElement,
	seed: string,
	options: NoiseAvatarOptions = {}
): void {
	const {
		gridSize = 5,
		displaySize = 64,
		hueRange = 60,
		saturationRange = [45, 70],
		lightnessRange = [40, 70],
	} = options;

	canvas.width = displaySize;
	canvas.height = displaySize;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const seedNum = hash32(seed);
	const rng = makePrng(seedNum);
	const baseHue = seedNum % 360;

	// Build value noise grid
	const G = gridSize + 1;
	const grid: number[] = Array.from({ length: G * G }, () => rng());
	const gridVal = (gx: number, gy: number) => grid[gy * G + gx];

	const imageData = ctx.createImageData(displaySize, displaySize);

	for (let py = 0; py < displaySize; py++) {
		for (let px = 0; px < displaySize; px++) {
			const fx = (px / displaySize) * gridSize;
			const fy = (py / displaySize) * gridSize;
			const gx = Math.floor(fx);
			const gy = Math.floor(fy);
			const tx = smoothstep(fx - gx);
			const ty = smoothstep(fy - gy);

			// Bilinear interpolation
			const v =
				(1 - ty) * ((1 - tx) * gridVal(gx, gy) + tx * gridVal(gx + 1, gy)) +
				ty * ((1 - tx) * gridVal(gx, gy + 1) + tx * gridVal(gx + 1, gy + 1));

			const hue = (baseHue + v * hueRange) % 360;
			const sat = saturationRange[0] + v * (saturationRange[1] - saturationRange[0]);
			const light = lightnessRange[0] + v * (lightnessRange[1] - lightnessRange[0]);

			const [r, g, b] = hslToRgb(hue / 360, sat / 100, light / 100);
			const i = (py * displaySize + px) * 4;
			imageData.data[i] = r;
			imageData.data[i + 1] = g;
			imageData.data[i + 2] = b;
			imageData.data[i + 3] = 255;
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Create a Svelte action that renders a noise avatar and updates reactively.
 *
 * @example
 * ```svelte
 * <canvas use:noiseAvatarAction={seed}></canvas>
 * ```
 */
export function noiseAvatarAction(
	canvas: HTMLCanvasElement,
	seed: string,
	options?: NoiseAvatarOptions
) {
	renderNoiseAvatar(canvas, seed, options);
	return {
		update(newSeed: string) {
			renderNoiseAvatar(canvas, newSeed, options);
		},
	};
}
