/**
 * @ewanc26/noise-avatar
 *
 * Deterministic value-noise avatar generation.
 *
 * Renders a unique, colour-rich noise texture onto an HTMLCanvasElement
 * from an arbitrary string seed. The same seed always produces the same image.
 * Zero runtime dependencies; works in any environment with a Canvas API.
 */
/**
 * djb2 hash — returns an unsigned 32-bit integer for any string.
 */
declare function hash32(str: string): number;
/**
 * Seeded LCG pseudo-random number generator.
 * Returns a function that produces floats in [0, 1).
 */
declare function makePrng(seed: number): () => number;
/**
 * Convert HSL (each component in [0, 1]) to an RGB triple ([0, 255] each).
 */
declare function hslToRgb(h: number, s: number, l: number): [number, number, number];
/**
 * Options for `renderNoiseAvatar`.
 */
interface NoiseAvatarOptions {
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
declare function renderNoiseAvatar(canvas: HTMLCanvasElement, seed: string, options?: NoiseAvatarOptions): void;
/**
 * Create a Svelte action that renders a noise avatar and updates reactively.
 *
 * @example
 * ```svelte
 * <canvas use:noiseAvatarAction={seed}></canvas>
 * ```
 */
declare function noiseAvatarAction(canvas: HTMLCanvasElement, seed: string, options?: NoiseAvatarOptions): {
    update(newSeed: string): void;
};

export { type NoiseAvatarOptions, hash32, hslToRgb, makePrng, noiseAvatarAction, renderNoiseAvatar };
