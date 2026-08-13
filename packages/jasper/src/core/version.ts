/**
 * CLI version string, read directly from package.json so it can never drift.
 * Node-only (uses fs/url) - kept separate from config.ts so that browser-safe
 * config constants can be imported without pulling Node builtins into a
 * browser bundle (see jasper-web's import of core/config.js).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "../../package.json"), "utf-8"),
) as { version: string };

export const VERSION = pkg.version;
