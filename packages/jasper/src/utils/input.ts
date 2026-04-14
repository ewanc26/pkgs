/**
 * Interactive input utilities for CLI
 */
import * as readline from "readline";
import fs from "fs";
import path from "path";

/**
 * Create a readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 * @param message The prompt message
 * @param hidden Whether to hide the input (for passwords)
 */
export async function prompt(message: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();

    if (hidden) {
      // Hide input for passwords
      process.stdout.write(message);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      let input = "";
      const onData = (char: string) => {
        switch (char) {
          case "\n":
          case "\r":
          case "\u0004": // Ctrl+D
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onData);
            process.stdout.write("\n");
            rl.close();
            resolve(input);
            break;
          case "\u0003": // Ctrl+C
            process.exit();
            break;
          case "\u007F": // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.clearLine(0);
              process.stdout.cursorTo(0);
              process.stdout.write(message + "*".repeat(input.length));
            }
            break;
          default:
            input += char;
            process.stdout.write("*");
            break;
        }
      };
      process.stdin.on("data", onData);
    } else {
      rl.question(message, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Prompt for yes/no confirmation
 * @param message The confirmation message
 * @param defaultYes Whether the default is yes (true) or no (false)
 */
export async function confirm(
  message: string,
  defaultYes = false,
): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await prompt(`${message} ${hint}: `);
  if (!answer) return defaultYes;
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * Prompt with validation
 * @param message The prompt message
 * @param validate Validation function, returns error message or null if valid
 */
export async function promptWithValidation(
  message: string,
  validate: (input: string) => string | null,
): Promise<string> {
  while (true) {
    const answer = await prompt(message);
    const error = validate(answer);
    if (!error) return answer;
    console.log(error);
  }
}

/**
 * Validate a file path exists
 */
export function validateFilePath(
  input: string,
  expectedExtension?: string,
): string | null {
  if (!input.trim()) {
    return "Path is required";
  }

  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) {
    return `Path does not exist: ${resolved}`;
  }

  if (expectedExtension) {
    const ext = path.extname(resolved).toLowerCase();
    if (
      ext !== `.${expectedExtension}` &&
      ext !== `.${expectedExtension.toLowerCase()}`
    ) {
      return `Expected .${expectedExtension} file, got ${ext}`;
    }
  }

  return null;
}

/**
 * Select from a list of options
 * @param message The prompt message
 * @param options Array of options
 * @param defaultIndex Default selection index (0-based)
 */
export async function select(
  message: string,
  options: string[],
  defaultIndex = 0,
): Promise<number> {
  console.log(`\n${message}`);
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? "→" : " ";
    console.log(`  ${marker} ${i + 1}. ${opt}`);
  });
  console.log("");

  const answer = await prompt(`Select [1-${options.length}]: `);
  if (!answer) return defaultIndex;

  const num = parseInt(answer, 10);
  if (isNaN(num) || num < 1 || num > options.length) {
    return defaultIndex;
  }
  return num - 1;
}
