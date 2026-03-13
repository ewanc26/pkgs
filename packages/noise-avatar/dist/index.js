// src/index.ts
import {
  hash32,
  makePrng,
  hslToRgb,
  makeValueNoiseSampler,
  generateNoisePixels
} from "@ewanc26/noise";
import { renderNoise, noiseAction } from "@ewanc26/noise";
function toRenderOptions(opts) {
  const colorMode = {
    type: "hsl",
    hueRange: opts.hueRange,
    saturationRange: opts.saturationRange,
    lightnessRange: opts.lightnessRange
  };
  return {
    size: opts.displaySize ?? 64,
    gridSize: opts.gridSize,
    colorMode
  };
}
function renderNoiseAvatar(canvas, seed, options = {}) {
  renderNoise(canvas, seed, toRenderOptions(options));
}
function noiseAvatarAction(canvas, seed, options = {}) {
  const params = { seed, ...toRenderOptions(options) };
  const action = noiseAction(canvas, params);
  return {
    update(newSeed) {
      action.update({ seed: newSeed, ...toRenderOptions(options) });
    }
  };
}
export {
  generateNoisePixels,
  hash32,
  hslToRgb,
  makePrng,
  makeValueNoiseSampler,
  noiseAvatarAction,
  renderNoiseAvatar
};
