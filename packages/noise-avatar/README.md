# @ewanc26/noise-avatar

Deterministic value-noise avatar generation from a string seed. Zero runtime dependencies, works in any environment with a Canvas API (browsers, jsdom).

Part of the [`@ewanc26/pkgs`](https://github.com/ewanc26/pkgs) monorepo.

## Install

```bash
pnpm add @ewanc26/noise-avatar
```

## Usage

### Vanilla

```ts
import { renderNoiseAvatar } from '@ewanc26/noise-avatar';

const canvas = document.querySelector('canvas');
renderNoiseAvatar(canvas, 'Alice|Subscription');
```

### Svelte action

```svelte
<script>
  import { noiseAvatarAction } from '@ewanc26/noise-avatar';
  let seed = 'Alice|Subscription';
</script>

<canvas use:noiseAvatarAction={seed} class="rounded-full"></canvas>
```

## API

### `renderNoiseAvatar(canvas, seed, options?)`

Renders a deterministic value-noise texture onto `canvas`. Resizes the canvas to `options.displaySize` (default `64`).

| Option | Type | Default | Description |
|---|---|---|---|
| `gridSize` | `number` | `5` | Noise grid resolution |
| `displaySize` | `number` | `64` | Canvas pixel size |
| `hueRange` | `number` | `60` | Hue spread in degrees around seed-derived base hue |
| `saturationRange` | `[number, number]` | `[45, 70]` | Saturation min/max (%) |
| `lightnessRange` | `[number, number]` | `[40, 70]` | Lightness min/max (%) |

### `noiseAvatarAction(canvas, seed, options?)`

Svelte action wrapper around `renderNoiseAvatar`. Re-renders when `seed` changes via `update`.

### `hash32(str)`

djb2 hash — returns an unsigned 32-bit integer. Exported for custom seed construction.

### `makePrng(seed)`

Seeded LCG PRNG — returns a `() => number` producing floats in `[0, 1)`.

### `hslToRgb(h, s, l)`

Converts HSL (components in `[0, 1]`) to an RGB triple (`[0, 255]` each).

## Licence

AGPL-3.0-only
