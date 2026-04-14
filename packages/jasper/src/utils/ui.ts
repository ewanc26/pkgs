/**
 * CLI UI utilities (spinners, headers, key-value display)
 */
import ora from "ora";

let spinner: ReturnType<typeof ora> | null = null;

/**
 * Display a header
 */
export function header(title: string): void {
  console.log("");
  console.log("\x1b[1m" + title + "\x1b[0m");
  console.log("");
}

/**
 * Display a key-value pair
 */
export function keyValue(key: string, value: string): void {
  console.log(`  \x1b[90m${key}:\x1b[0m ${value}`);
}

/**
 * Display info message
 */
export function info(message: string): void {
  console.log(`  ${message}`);
}

/**
 * Display warning message
 */
export function warning(message: string): void {
  console.log(`  \x1b[33m⚠️  ${message}\x1b[0m`);
}

/**
 * Start a spinner
 */
export function startSpinner(message: string): void {
  if (spinner) {
    spinner.stop();
  }
  spinner = ora(message).start();
}

/**
 * Succeed spinner
 */
export function succeedSpinner(message?: string): void {
  if (spinner) {
    spinner.succeed(message);
    spinner = null;
  }
}

/**
 * Fail spinner
 */
export function failSpinner(message?: string): void {
  if (spinner) {
    spinner.fail(message);
    spinner = null;
  }
}

/**
 * Stop spinner (no status)
 */
export function stopSpinner(): void {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
}

/**
 * Print blank line
 */
export function blank(): void {
  console.log("");
}
