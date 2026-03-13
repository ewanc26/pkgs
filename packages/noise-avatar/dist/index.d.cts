export { generateNoisePixels, hash32, hslToRgb, makePrng, makeValueNoiseSampler } from '@ewanc26/noise';

/**
 * @ewanc26/noise-avatar
 *
 * Opinionated avatar-flavoured wrapper around @ewanc26/noise.
 *
 * Provides a fixed HSL colour mode and square-canvas defaults so callers
 * don't have to think about noise options for the common avatar use-case.
 * The underlying primitives are re-exported for consumers that want them.
 */

interface NoiseAvatarOptions {
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
/**
 * Render a deterministic value-noise avatar onto `canvas`.
 *
 * @param canvas  Target HTMLCanvasElement (will be resized to `displaySize`).
 * @param seed    Arbitrary string — same seed always produces the same image.
 * @param options Avatar rendering options.
 */
declare function renderNoiseAvatar(canvas: HTMLCanvasElement, seed: string, options?: NoiseAvatarOptions): void;
/**
 * Svelte action that renders a noise avatar and updates reactively when
 * `seed` changes.
 *
 * @example
 * ```svelte
 * <canvas use:noiseAvatarAction={seed}></canvas>
 * ```
 */
declare function noiseAvatarAction(canvas: HTMLCanvasElement, seed: string, options?: NoiseAvatarOptions): {
    update(newSeed: string): void;
};

export { type NoiseAvatarOptions, noiseAvatarAction, renderNoiseAvatar };
