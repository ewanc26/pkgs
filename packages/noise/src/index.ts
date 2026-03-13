/**
 * @ewanc26/noise
 *
 * Generic deterministic value-noise generation.
 *
 * Produces consistent noise from an arbitrary string seed — same seed always
 * gives the same output. Supports arbitrary dimensions, multi-octave FBM, and
 * several colour modes. Zero runtime dependencies; works anywhere with a
 * Uint8ClampedArray (Node.js, browsers, workers).
 *
 * Canvas and Svelte action helpers are also exported for convenience.
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

// ─── Colour modes ────────────────────────────────────────────────────────────

/**
 * HSL colour mode — hue derived from seed, noise value shifts hue/sat/light.
 */
export interface HslColorMode {
	type: 'hsl';
	/** Hue spread in degrees around the seed-derived base hue. @default 60 */
	hueRange?: number;
	/** Saturation [min, max] as percentages. @default [45, 70] */
	saturationRange?: [number, number];
	/** Lightness [min, max] as percentages. @default [40, 70] */
	lightnessRange?: [number, number];
}

/**
 * Grayscale colour mode — noise value maps to a luminance range.
 */
export interface GrayscaleColorMode {
	type: 'grayscale';
	/** Luminance [min, max] in [0, 255]. @default [0, 255] */
	range?: [number, number];
}

/**
 * Palette colour mode — noise value indexes into a list of RGB colours
 * using smooth interpolation between adjacent entries.
 */
export interface PaletteColorMode {
	type: 'palette';
	/** At least two RGB triples, e.g. [[255,0,128],[0,200,255]]. */
	colors: [number, number, number][];
}

export type ColorMode = HslColorMode | GrayscaleColorMode | PaletteColorMode;

function applyColorMode(
	noiseValue: number,
	mode: ColorMode,
	baseHue: number
): [number, number, number] {
	switch (mode.type) {
		case 'hsl': {
			const hueRange = mode.hueRange ?? 60;
			const [sMin, sMax] = mode.saturationRange ?? [45, 70];
			const [lMin, lMax] = mode.lightnessRange ?? [40, 70];
			const hue = (baseHue + noiseValue * hueRange) % 360;
			const sat = sMin + noiseValue * (sMax - sMin);
			const light = lMin + noiseValue * (lMax - lMin);
			return hslToRgb(hue / 360, sat / 100, light / 100);
		}
		case 'grayscale': {
			const [lo, hi] = mode.range ?? [0, 255];
			const v = Math.round(lo + noiseValue * (hi - lo));
			return [v, v, v];
		}
		case 'palette': {
			const colors = mode.colors;
			if (colors.length === 0) return [0, 0, 0];
			if (colors.length === 1) return colors[0];
			const scaled = noiseValue * (colors.length - 1);
			const lo = Math.floor(scaled);
			const hi = Math.min(lo + 1, colors.length - 1);
			const t = scaled - lo;
			const [r1, g1, b1] = colors[lo];
			const [r2, g2, b2] = colors[hi];
			return [
				Math.round(r1 + t * (r2 - r1)),
				Math.round(g1 + t * (g2 - g1)),
				Math.round(b1 + t * (b2 - b1)),
			];
		}
	}
}

// ─── Value noise ─────────────────────────────────────────────────────────────

function smoothstep(t: number): number {
	return t * t * (3 - 2 * t);
}

/**
 * Build a value-noise grid and return a sampler for normalised coordinates.
 *
 * @param gridSize  Number of grid cells along each axis.
 * @param rng       Seeded PRNG from `makePrng`.
 * @returns         A function `(nx, ny) → float in [0, 1]` where nx, ny ∈ [0, 1].
 */
export function makeValueNoiseSampler(
	gridSize: number,
	rng: () => number
): (nx: number, ny: number) => number {
	const G = gridSize + 1;
	const grid = Array.from({ length: G * G }, () => rng());
	const at = (gx: number, gy: number) => grid[gy * G + gx];

	return (nx: number, ny: number) => {
		const fx = nx * gridSize;
		const fy = ny * gridSize;
		const gx = Math.floor(fx);
		const gy = Math.floor(fy);
		const tx = smoothstep(fx - gx);
		const ty = smoothstep(fy - gy);
		return (
			(1 - ty) * ((1 - tx) * at(gx, gy) + tx * at(gx + 1, gy)) +
			ty * ((1 - tx) * at(gx, gy + 1) + tx * at(gx + 1, gy + 1))
		);
	};
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface NoiseOptions {
	/**
	 * Side length of the noise grid (higher = finer detail).
	 * @default 5
	 */
	gridSize?: number;
	/**
	 * Number of FBM octaves. 1 = plain value noise. More octaves add
	 * finer detail at the cost of a little extra work.
	 * @default 1
	 */
	octaves?: number;
	/**
	 * FBM persistence — how much each successive octave contributes.
	 * @default 0.5
	 */
	persistence?: number;
	/**
	 * FBM lacunarity — how much each successive octave's frequency increases.
	 * @default 2
	 */
	lacunarity?: number;
	/**
	 * How noise values map to colours.
	 * @default { type: 'hsl' }
	 */
	colorMode?: ColorMode;
}

// ─── Core pixel generation ───────────────────────────────────────────────────

/**
 * Generate raw RGBA pixel data for a noise texture.
 *
 * Works in any environment that has `Uint8ClampedArray` (all modern runtimes).
 * No canvas or DOM required.
 *
 * @param width   Output width in pixels.
 * @param height  Output height in pixels.
 * @param seed    Arbitrary string — same seed always produces the same image.
 * @param options Noise and colour options.
 * @returns       A `Uint8ClampedArray` of length `width * height * 4` (RGBA).
 */
export function generateNoisePixels(
	width: number,
	height: number,
	seed: string,
	options: NoiseOptions = {}
): Uint8ClampedArray {
	const {
		gridSize = 5,
		octaves = 1,
		persistence = 0.5,
		lacunarity = 2,
		colorMode = { type: 'hsl' },
	} = options;

	const seedNum = hash32(seed);
	const baseHue = seedNum % 360;

	// Build one PRNG per octave so they don't interfere.
	const samplers = Array.from({ length: octaves }, (_, i) => {
		const rng = makePrng(hash32(`${seed}|oct${i}`));
		return makeValueNoiseSampler(gridSize * Math.pow(lacunarity, i), rng);
	});

	const pixels = new Uint8ClampedArray(width * height * 4);

	for (let py = 0; py < height; py++) {
		for (let px = 0; px < width; px++) {
			const nx = px / width;
			const ny = py / height;

			// FBM accumulation
			let value = 0;
			let amplitude = 1;
			let maxAmplitude = 0;
			for (let o = 0; o < octaves; o++) {
				value += samplers[o](nx, ny) * amplitude;
				maxAmplitude += amplitude;
				amplitude *= persistence;
			}
			// Normalise to [0, 1]
			value /= maxAmplitude;

			const [r, g, b] = applyColorMode(value, colorMode, baseHue);
			const idx = (py * width + px) * 4;
			pixels[idx] = r;
			pixels[idx + 1] = g;
			pixels[idx + 2] = b;
			pixels[idx + 3] = 255;
		}
	}

	return pixels;
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

export interface RenderNoiseOptions extends NoiseOptions {
	/**
	 * Rendered canvas width in pixels. Defaults to `size` if set, else 64.
	 */
	width?: number;
	/**
	 * Rendered canvas height in pixels. Defaults to `size` if set, else 64.
	 */
	height?: number;
	/**
	 * Shorthand to set both width and height to the same value.
	 */
	size?: number;
}

/**
 * Render a deterministic noise texture onto an existing `HTMLCanvasElement`.
 *
 * @param canvas  Target canvas (will be resized).
 * @param seed    Arbitrary string — same seed always produces the same image.
 * @param options Render and noise options.
 */
export function renderNoise(
	canvas: HTMLCanvasElement,
	seed: string,
	options: RenderNoiseOptions = {}
): void {
	const { size, width: wOpt, height: hOpt, ...noiseOpts } = options;
	const width = wOpt ?? size ?? 64;
	const height = hOpt ?? size ?? 64;

	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const pixels = generateNoisePixels(width, height, seed, noiseOpts);
	const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
	ctx.putImageData(imageData, 0, 0);
}

// ─── Svelte action ───────────────────────────────────────────────────────────

export interface NoiseActionParams extends RenderNoiseOptions {
	seed: string;
}

/**
 * Svelte action that renders noise onto a canvas and re-renders reactively
 * when params change.
 *
 * @example
 * ```svelte
 * <script>
 *   import { noiseAction } from '@ewanc26/noise';
 * </script>
 *
 * <canvas use:noiseAction={{ seed: 'my-seed', size: 128, octaves: 3 }}></canvas>
 * ```
 */
export function noiseAction(
	canvas: HTMLCanvasElement,
	params: NoiseActionParams
) {
	const { seed, ...opts } = params;
	renderNoise(canvas, seed, opts);
	return {
		update(newParams: NoiseActionParams) {
			const { seed: newSeed, ...newOpts } = newParams;
			renderNoise(canvas, newSeed, newOpts);
		},
	};
}
