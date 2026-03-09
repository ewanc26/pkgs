// src/index.ts
function hash32(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = Math.imul(33, h) ^ str.charCodeAt(i);
  return h >>> 0;
}
function makePrng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 4294967296;
  };
}
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}
function renderNoiseAvatar(canvas, seed, options = {}) {
  const {
    gridSize = 5,
    displaySize = 64,
    hueRange = 60,
    saturationRange = [45, 70],
    lightnessRange = [40, 70]
  } = options;
  canvas.width = displaySize;
  canvas.height = displaySize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const seedNum = hash32(seed);
  const rng = makePrng(seedNum);
  const baseHue = seedNum % 360;
  const G = gridSize + 1;
  const grid = Array.from({ length: G * G }, () => rng());
  const gridVal = (gx, gy) => grid[gy * G + gx];
  const imageData = ctx.createImageData(displaySize, displaySize);
  for (let py = 0; py < displaySize; py++) {
    for (let px = 0; px < displaySize; px++) {
      const fx = px / displaySize * gridSize;
      const fy = py / displaySize * gridSize;
      const gx = Math.floor(fx);
      const gy = Math.floor(fy);
      const tx = smoothstep(fx - gx);
      const ty = smoothstep(fy - gy);
      const v = (1 - ty) * ((1 - tx) * gridVal(gx, gy) + tx * gridVal(gx + 1, gy)) + ty * ((1 - tx) * gridVal(gx, gy + 1) + tx * gridVal(gx + 1, gy + 1));
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
function noiseAvatarAction(canvas, seed, options) {
  renderNoiseAvatar(canvas, seed, options);
  return {
    update(newSeed) {
      renderNoiseAvatar(canvas, newSeed, options);
    }
  };
}
export {
  hash32,
  hslToRgb,
  makePrng,
  noiseAvatarAction,
  renderNoiseAvatar
};
