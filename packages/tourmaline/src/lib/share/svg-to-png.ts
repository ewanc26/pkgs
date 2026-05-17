/**
 * Converts an SVG string to a PNG Uint8Array using an offscreen canvas.
 * Runs in the browser only.
 *
 * The SVG viewBox height is dynamic (varies by number of traits, genres, moods).
 * We parse it from the SVG string and scale to 2x for crisp output.
 */

const SCALE = 2;
const SVG_WIDTH = 600;

export function svgToPng(svgString: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // Parse the viewBox height from the SVG string
    const viewBoxMatch = svgString.match(/viewBox="0 0 \d+ (\d+)"/);
    const svgHeight = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 620;

    const canvasWidth = SVG_WIDTH * SCALE;
    const canvasHeight = svgHeight * SCALE;

    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (pngBlob) => {
          if (!pngBlob) {
            reject(new Error("toBlob returned null"));
            return;
          }
          pngBlob.arrayBuffer().then((buf) => {
            resolve(new Uint8Array(buf));
          });
        },
        "image/png",
        1.0,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image"));
    };

    img.src = url;
  });
}
