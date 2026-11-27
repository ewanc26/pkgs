import { getTui } from './tui.js';
import * as readline from 'readline';
import chalk from 'chalk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * True when malachite should never block on stdin: explicit --non-interactive,
 * a CI environment, or stdin isn't a TTY (piped/redirected/no terminal).
 */
export function isNonInteractive(): boolean {
  return (
    process.argv.includes('--non-interactive') ||
    Boolean(process.env.CI) ||
    !process.stdin.isTTY
  );
}

/**
 * Validate if a file or directory exists
 */
export function fileExists(filepath: string): boolean {
  try {
    return fs.existsSync(filepath);
  } catch {
    return false;
  }
}

/**
 * Check if path is a directory
 */
export function isDirectory(filepath: string): boolean {
  try {
    return fs.statSync(filepath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Validate file path and provide helpful feedback
 */
export function validateFilePath(
  filepath: string,
  fileType: 'csv' | 'json' | 'xml' | 'directory' | 'listenbrainz'
): { valid: boolean; message?: string } {
  if (!filepath || filepath.trim() === '') {
    return { valid: false, message: '⚠️  Path cannot be empty' };
  }

  const trimmedPath = filepath.trim();
  
  if (!fileExists(trimmedPath)) {
    // Try to provide helpful suggestions
    const dir = path.dirname(trimmedPath);
    const base = path.basename(trimmedPath);
    
    if (!fileExists(dir)) {
      return { valid: false, message: `⚠️  Directory does not exist: ${dir}` };
    }
    
    return { valid: false, message: `⚠️  File not found: ${base}\n   Try checking the file name and path` };
  }

  // Check if it's a directory when we expect a file
  if (fileType !== 'directory' && fileType !== 'listenbrainz' && isDirectory(trimmedPath)) {
    return { valid: false, message: `⚠️  Expected a file but got a directory: ${trimmedPath}` };
  }

  // Check file extension for specific types
  if (fileType === 'csv' && !trimmedPath.toLowerCase().endsWith('.csv')) {
    return { valid: false, message: `⚠️  Expected a CSV file, but got: ${path.extname(trimmedPath)}` };
  }

  if (fileType === 'xml' && !trimmedPath.toLowerCase().endsWith('.xml')) {
    return { valid: false, message: `⚠️  Expected an XML file, but got: ${path.extname(trimmedPath)}` };
  }

  if (fileType === 'json' && !isDirectory(trimmedPath) && !trimmedPath.toLowerCase().endsWith('.json')) {
    return { valid: false, message: `⚠️  Expected a JSON file or directory, but got: ${path.extname(trimmedPath)}` };
  }

  // A ListenBrainz export is a .zip of per-month .jsonl files, so accept the
  // archive, the unpacked directory, or any single export file.
  if (fileType === 'listenbrainz' && !isDirectory(trimmedPath)) {
    const lower = trimmedPath.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.json') && !lower.endsWith('.jsonl')) {
      return {
        valid: false,
        message: `⚠️  Expected a .zip, .json, .jsonl, or export directory, but got: ${path.extname(trimmedPath)}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Turn what a terminal delivers for a typed or dragged-in file into a path:
 * surrounding quotes, shell backslash escapes and a leading `~` are removed.
 */
export function cleanPathInput(raw: string, platform: NodeJS.Platform = process.platform): string {
  const trimmed = raw.trim();
  let cleaned = stripQuotes(trimmed);
  // Backslashes separate directories on Windows; elsewhere an unquoted one that
  // does not name a real file is an escape.
  if (cleaned === trimmed && platform !== 'win32' && !fileExists(cleaned)) {
    cleaned = cleaned.replace(/\\(.)/g, '$1');
  }
  return cleaned === '~' || cleaned.startsWith('~/') ? os.homedir() + cleaned.slice(1) : cleaned;
}

/**
 * Ask for a file path until it validates. With `optional`, pressing Enter skips
 * and returns an empty string.
 */
export async function promptPath(
  question: string,
  fileType: Parameters<typeof validateFilePath>[1],
  { optional = false, ask = prompt }: { optional?: boolean; ask?: (question: string) => Promise<string> } = {}
): Promise<string> {
  while (true) {
    const input = cleanPathInput(await ask(question));
    if (!input && optional) return '';

    const result = validateFilePath(input, fileType);
    if (result.valid) return input;
    if (result.message) console.log(result.message);
    console.log('Please try again.\n');
  }
}

/**
 * Prompt user for input with validation and retry logic
 */
export async function promptWithValidation(
  question: string,
  validator?: (input: string) => { valid: boolean; message?: string },
  isPassword = false
): Promise<string> {
  while (true) {
    const input = await prompt(question, isPassword);
    
    if (!validator) {
      return input;
    }
    
    const result = validator(input);
    if (result.valid) {
      return input;
    }
    
    if (result.message) {
      console.log(result.message);
    }
    console.log('Please try again.\n');
  }
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Strip surrounding quotes from a string (single or double quotes)
 */
function stripQuotes(str: string): string {
  str = str.trim();
  if ((str.startsWith("'") && str.endsWith("'")) || 
      (str.startsWith('"') && str.endsWith('"'))) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Display a menu and get user selection
 */
export async function menu(title: string, options: Array<{ key: string; label: string; description?: string }>): Promise<string> {
  const tui = getTui();
  if (tui) {
    return tui.select(
      title,
      options.map((o) => ({ value: o.key.toLowerCase(), label: o.label, hint: o.description })),
    );
  }

  console.log(chalk.bold(`\n${title}`));
  console.log(chalk.gray('─'.repeat(50)));
  
  for (const option of options) {
    if (option.description) {
      console.log(`  ${chalk.cyan(option.key)}) ${option.label}`);
      console.log(`     ${chalk.gray(option.description)}`);
    } else {
      console.log(`  ${chalk.cyan(option.key)}) ${option.label}`);
    }
  }
  
  console.log(chalk.gray('─'.repeat(50)));
  
  const validKeys = options.map(o => o.key.toLowerCase());
  let answer = '';
  
  while (!validKeys.includes(answer.toLowerCase())) {
    answer = await prompt('Select an option: ');
    if (!validKeys.includes(answer.toLowerCase())) {
      console.log(chalk.red(`Invalid option. Please choose: ${validKeys.join(', ')}`));
    }
  }
  
  return answer.toLowerCase();
}

/**
 * Confirm an action with the user
 */
export async function confirm(question: string, defaultYes = false): Promise<boolean> {
  const tui = getTui();
  // The interface draws its own Yes / No, so drop any typed hint.
  if (tui) return tui.confirm(question.replace(/\s*\([yY]\/[nN]\)\s*$/, ''), defaultYes);

  const suffix = defaultYes ? ' (Y/n) ' : ' (y/N) ';
  const answer = await prompt(question + suffix);
  
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    return true;
  }
  if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
    return false;
  }
  
  return defaultYes;
}

/**
 * Read user input from command line with proper password masking
 */
export function prompt(question: string, hideInput = false): Promise<string> {
  if (isNonInteractive()) {
    console.error(`malachite: refusing to prompt in non-interactive mode: "${question.trim()}"`);
    console.error('Pass the required flag(s) explicitly, or run malachite --help for usage.');
    process.exit(1);
  }
  const tui = getTui();
  if (tui) {
    return tui
      .input(stripAnsi(question), { mask: hideInput })
      .then((answer) => (hideInput ? answer : stripQuotes(answer)));
  }
  return new Promise((resolve) => {
    if (hideInput) {
      // For password input, use raw mode
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;

      // Set raw mode to capture individual keystrokes
      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }

      stdin.resume();
      stdin.setEncoding('utf8');

      process.stdout.write(question);

      let password = '';
      const onData = (char: Buffer | string) => {
        const charStr = char.toString();

        switch (charStr) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl-D
            stdin.removeListener('data', onData);
            if (stdin.isTTY) {
              stdin.setRawMode(wasRaw);
            }
            stdin.pause();
            process.stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl-C
            process.exit(1);
            break;
          case '\u007f': // Backspace
          case '\b': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.clearLine(0);
              process.stdout.cursorTo(0);
              process.stdout.write(question + '*'.repeat(password.length));
            }
            break;
          default:
            password += charStr;
            process.stdout.write('*');
            break;
        }
      };

      stdin.on('data', onData);
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(question, (answer) => {
        rl.close();
        // Strip quotes from file paths
        const cleaned = stripQuotes(answer);
        resolve(cleaned);
      });
    }
  });
}
