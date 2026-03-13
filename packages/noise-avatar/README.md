# @ewanc26/noise-avatar

Deterministic value-noise avatar generation from a string seed. Thin opinionated wrapper around [`@ewanc26/noise`](../noise). Zero extra runtime dependencies, works in any environment with a Canvas API (browsers, jsdom).

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

Renders a deterministic HSL value-noise texture onto `canvas` at `displaySize × displaySize` pixels.

| Option | Type | Default | Description |
|---|---|---|---|
| `gridSize` | `number` | `5` | Noise grid resolution |
| `displaySize` | `number` | `64` | Canvas pixel size |
| `hueRange` | `number` | `60` | Hue spread in degrees around seed-derived base hue |
| `saturationRange` | `[number, number]` | `[45, 70]` | Saturation min/max (%) |
| `lightnessRange` | `[number, number]` | `[40, 70]` | Lightness min/max (%) |

### `noiseAvatarAction(canvas, seed, options?)`

Svelte action wrapper. Re-renders when `seed` changes via `update`.

### Re-exported primitives

`hash32`, `makePrng`, `hslToRgb`, `makeValueNoiseSampler`, and `generateNoisePixels`
are all re-exported from `@ewanc26/noise` for convenience.

For full control over dimensions, FBM octaves, and colour modes, use
[`@ewanc26/noise`](../noise) directly.

## Licence

AGPL-3.0-only
