"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  generateNoisePixels: () => import_noise.generateNoisePixels,
  hash32: () => import_noise.hash32,
  hslToRgb: () => import_noise.hslToRgb,
  makePrng: () => import_noise.makePrng,
  makeValueNoiseSampler: () => import_noise.makeValueNoiseSampler,
  noiseAvatarAction: () => noiseAvatarAction,
  renderNoiseAvatar: () => renderNoiseAvatar
});
module.exports = __toCommonJS(index_exports);
var import_noise = require("@ewanc26/noise");
var import_noise2 = require("@ewanc26/noise");
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
  (0, import_noise2.renderNoise)(canvas, seed, toRenderOptions(options));
}
function noiseAvatarAction(canvas, seed, options = {}) {
  const params = { seed, ...toRenderOptions(options) };
  const action = (0, import_noise2.noiseAction)(canvas, params);
  return {
    update(newSeed) {
      action.update({ seed: newSeed, ...toRenderOptions(options) });
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateNoisePixels,
  hash32,
  hslToRgb,
  makePrng,
  makeValueNoiseSampler,
  noiseAvatarAction,
  renderNoiseAvatar
});
