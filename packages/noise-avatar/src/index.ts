/**
 * @ewanc26/noise-avatar
 *
 * Opinionated avatar-flavoured wrapper around @ewanc26/noise.
 *
 * Provides a fixed HSL colour mode and square-canvas defaults so callers
 * don't have to think about noise options for the common avatar use-case.
 * The underlying primitives are re-exported for consumers that want them.
 */

export {
	hash32,
	makePrng,
	hslToRgb,
	makeValueNoiseSampler,
	generateNoisePixels,
} from '@ewanc26/noise';

import { renderNoise, noiseAction } from '@ewanc26/noise';
import type { HslColorMode, RenderNoiseOptions } from '@ewanc26/noise';

// ─── Avatar-specific options ─────────────────────────────────────────────────

export interface NoiseAvatarOptions {
	/**
	 * Side length of the noise grid.
	 * @default 5
	 */
	gridSize?: number;
	/**
	 * Width and height of the rendered canvas in pixels.
	 * @default 64
	 */
	displaySize?: number;
	/**
	 * Hue spread in degrees around the seed-derived base hue.
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

function toRenderOptions(opts: NoiseAvatarOptions): RenderNoiseOptions {
	const colorMode: HslColorMode = {
		type: 'hsl',
		hueRange: opts.hueRange,
		saturationRange: opts.saturationRange,
		lightnessRange: opts.lightnessRange,
	};
	return {
		size: opts.displaySize ?? 64,
		gridSize: opts.gridSize,
		colorMode,
	};
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Render a deterministic value-noise avatar onto `canvas`.
 *
 * @param canvas  Target HTMLCanvasElement (will be resized to `displaySize`).
 * @param seed    Arbitrary string — same seed always produces the same image.
 * @param options Avatar rendering options.
 */
export function renderNoiseAvatar(
	canvas: HTMLCanvasElement,
	seed: string,
	options: NoiseAvatarOptions = {}
): void {
	renderNoise(canvas, seed, toRenderOptions(options));
}

/**
 * Svelte action that renders a noise avatar and updates reactively when
 * `seed` changes.
 *
 * @example
 * ```svelte
 * <canvas use:noiseAvatarAction={seed}></canvas>
 * ```
 */
export function noiseAvatarAction(
	canvas: HTMLCanvasElement,
	seed: string,
	options: NoiseAvatarOptions = {}
) {
	const params = { seed, ...toRenderOptions(options) };
	const action = noiseAction(canvas, params);
	return {
		update(newSeed: string) {
			action.update({ seed: newSeed, ...toRenderOptions(options) });
		},
	};
}
