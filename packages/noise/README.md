# @ewanc26/noise

Generic deterministic value-noise generation from a string seed. Arbitrary dimensions, multi-octave FBM, multiple colour modes. Zero runtime dependencies, works in any environment with a `Uint8ClampedArray` (browsers, Node.js, workers).

Part of the [`@ewanc26/pkgs`](https://github.com/ewanc26/pkgs) monorepo.

## Install

```bash
pnpm add @ewanc26/noise
```

## Usage

### Raw pixels (no DOM required)

```ts
import { generateNoisePixels } from '@ewanc26/noise';

const pixels = generateNoisePixels(256, 256, 'my-seed', {
  octaves: 4,
  colorMode: { type: 'grayscale' },
});
// pixels is a Uint8ClampedArray of RGBA values
```

### Canvas

```ts
import { renderNoise } from '@ewanc26/noise';

const canvas = document.querySelector('canvas');
renderNoise(canvas, 'my-seed', { size: 128, octaves: 3 });
```

### Svelte action

```svelte
<script>
  import { noiseAction } from '@ewanc26/noise';

  let seed = 'my-seed';
</script>

<canvas use:noiseAction={{ seed, size: 128, octaves: 3 }}></canvas>
```

## API

### `generateNoisePixels(width, height, seed, options?)`

Generates raw RGBA pixel data — no canvas or DOM needed.

Returns a `Uint8ClampedArray` of length `width * height * 4`.

### `renderNoise(canvas, seed, options?)`

Renders noise onto an existing `HTMLCanvasElement` (resizes it to `width`/`height`/`size`).

### `noiseAction(canvas, params)`

Svelte action wrapper around `renderNoise`. Re-renders reactively when `params` changes via `update`.

Params object: `{ seed, ...NoiseOptions, width?, height?, size? }`

---

### Noise options

| Option | Type | Default | Description |
|---|---|---|---|
| `gridSize` | `number` | `5` | Noise grid resolution |
| `octaves` | `number` | `1` | FBM octave count (1 = plain value noise) |
| `persistence` | `number` | `0.5` | FBM amplitude falloff per octave |
| `lacunarity` | `number` | `2` | FBM frequency multiplier per octave |
| `colorMode` | `ColorMode` | `{ type: 'hsl' }` | How noise values map to colours |

### Render options (canvas/action only)

| Option | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `64` | Canvas width in pixels |
| `height` | `number` | `64` | Canvas height in pixels |
| `size` | `number` | — | Shorthand to set width and height equally |

### Colour modes

**`{ type: 'hsl' }`** — hue derived from seed, noise shifts hue/saturation/lightness.

| Option | Type | Default |
|---|---|---|
| `hueRange` | `number` | `60` |
| `saturationRange` | `[number, number]` | `[45, 70]` |
| `lightnessRange` | `[number, number]` | `[40, 70]` |

**`{ type: 'grayscale' }`** — noise value maps to luminance.

| Option | Type | Default |
|---|---|---|
| `range` | `[number, number]` | `[0, 255]` |

**`{ type: 'palette', colors }`** — noise value interpolates through an ordered list of RGB colours.

```ts
colorMode: {
  type: 'palette',
  colors: [[0, 0, 128], [0, 200, 255], [255, 255, 255]],
}
```

---

### Core primitives

| Export | Description |
|---|---|
| `hash32(str)` | djb2 hash → unsigned 32-bit integer |
| `makePrng(seed)` | Seeded LCG PRNG → `() => float in [0, 1)` |
| `hslToRgb(h, s, l)` | HSL (components in `[0, 1]`) → RGB triple (`[0, 255]`) |
| `makeValueNoiseSampler(gridSize, rng)` | Returns `(nx, ny) → float in [0, 1]` value-noise sampler |

## Licence

AGPL-3.0-only
