/**
 * CLI argument parsing and command routing
 */
import { parseArgs } from "node:util";
import chalk from "chalk";
import { VERSION } from "../core/config.js";
import type { CommandLineArgs, ImportOptions } from "../core/types.js";
import { LogLevel } from "../utils/logger.js";

export const HELP_TEXT = `
${chalk.bold("Jasper")} — Instagram → Grain Importer
${chalk.gray("Convert your Instagram photos to posts on Grain.social")}

${chalk.bold("USAGE")}
  jasper [OPTIONS]

${chalk.bold("OPTIONS")}
  -i, --input <path>      Path to Instagram export ZIP or directory
  --dry-run               Preview posts without importing
  --limit <N>             Import at most N posts
  --reverse               Process newest posts first (default: oldest first)
  -v, --verbose           Enable debug logging
  -q, --quiet             Suppress non-essential output
  -y, --yes               Skip confirmation prompts

${chalk.bold("AUTH OPTIONS")}
  --oauth-login           Sign in via OAuth (opens browser)
  --logout [DID]         Sign out (removes stored session)
  --list-sessions         List stored OAuth sessions
  --handle <handle>       AT Protocol handle for app password login
  --password <password>   App password for login

${chalk.bold("EXAMPLES")}
  ${chalk.gray("# Interactive mode")}
  jasper

  ${chalk.gray("# Import from ZIP with confirmation")}
  jasper -i instagram-export.zip

  ${chalk.gray("# Preview without importing")}
  jasper -i instagram-export.zip --dry-run

  ${chalk.gray("# Import first 50 posts, skip confirmation")}
  jasper -i instagram-export.zip --limit 50 -y

  ${chalk.gray("# Sign in with OAuth")}
  jasper --oauth-login

  ${chalk.gray("# Sign in with app password (non-interactive)")}
  jasper -i export.zip --handle your.handle --password app-password

${chalk.bold("MORE INFO")}
  ${chalk.gray("Privacy:")} https://github.com/ewanc26/pkgs/tree/main/packages/jasper/PRIVACY.md
  ${chalk.gray("Issues:")} https://github.com/ewanc26/pkgs/issues
`;

/**
 * Parse CLI arguments
 */
export function parseCliArgs(argv: string[]): CommandLineArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      input: { type: "string", short: "i" },
      "dry-run": { type: "boolean" },
      limit: { type: "string" },
      reverse: { type: "boolean" },
      yes: { type: "boolean", short: "y" },
      verbose: { type: "boolean", short: "v" },
      quiet: { type: "boolean", short: "q" },
      "oauth-login": { type: "boolean" },
      logout: { type: "string" },
      "list-sessions": { type: "boolean" },
      handle: { type: "string" },
      password: { type: "string" },
    },
    strict: false,
  }) as { values: Record<string, string | boolean | undefined> };

  return {
    help: values.help as boolean | undefined,
    input: values.input as string | undefined,
    dryRun: values["dry-run"] as boolean | undefined,
    limit: values.limit ? parseInt(values.limit as string, 10) : undefined,
    reverse: values.reverse as boolean | undefined,
    yes: values.yes as boolean | undefined,
    verbose: values.verbose as boolean | undefined,
    quiet: values.quiet as boolean | undefined,
    oauthLogin: values["oauth-login"] as boolean | undefined,
    logout: values.logout as string | undefined,
    listSessions: values["list-sessions"] as boolean | undefined,
    handle: values.handle as string | undefined,
    password: values.password as string | undefined,
  };
}

/**
 * Convert CLI args to ImportOptions
 */
export function argsToImportOptions(args: CommandLineArgs): ImportOptions {
  return {
    input: args.input || "",
    dryRun: args.dryRun || false,
    limit: args.limit,
    reverse: args.reverse || false,
    yes: args.yes || false,
    verbose: args.verbose || false,
    quiet: args.quiet || false,
  };
}

/**
 * Get log level from CLI args
 */
export function getLogLevelFromArgs(args: CommandLineArgs): LogLevel {
  if (args.quiet) return LogLevel.WARN;
  if (args.verbose) return LogLevel.DEBUG;
  return LogLevel.INFO;
}

/**
 * Print help text
 */
export function printHelp(): void {
  console.log(HELP_TEXT);
}

/**
 * Print version
 */
export function printVersion(): void {
  console.log(`Jasper v${VERSION}`);
}

/**
 * Validate import options
 */
export function validateImportOptions(options: ImportOptions): string | null {
  if (!options.input) {
    return "Input path required. Use -i <path> or --input <path>";
  }
  return null;
}
