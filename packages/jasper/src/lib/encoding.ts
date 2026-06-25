/**
 * Facebook/Instagram encoding fix — environment-agnostic.
 * Extracted from parser.ts so browser.ts can use it without pulling
 * in Node.js dependencies (fs, path, logger).
 *
 * See: https://sorashi.github.io/fix-facebook-json-archive-encoding
 * See: https://github.com/pixelfed/pixelfed/pull/4726
 */

/**
 * Fix Facebook/Instagram's broken UTF-8 encoding in JSON export files.
 * Replaces \\u00XX escape sequences with actual characters.
 */
export function fixFacebookEncoding(str: string): string {
  // Replace \\u00XX sequences with actual characters
  const replaced = str.replace(/\\u00([a-f0-9]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  // Convert to proper UTF-8
  const buffer = Array.from(replaced, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(new Uint8Array(buffer));
}
