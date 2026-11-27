/** The questions opal asks at a terminal when run without arguments. */
import { existsSync, statSync } from 'node:fs';
import type { Tui } from '@ewanc26/tui';
import { cleanPathInput } from '@ewanc26/tui/path';
import type { Platform } from './types.js';

export interface WizardAnswers {
  source: Platform;
  input: string;
  output?: string;
  publish: boolean;
  /** Show what would be published, without signing in. */
  preview: boolean;
}

const SOURCES: { value: Platform; label: string; hint: string }[] = [
  { value: 'twitter', label: 'Twitter / X', hint: 'tweets.js from your archive' },
  { value: 'mastodon', label: 'Mastodon', hint: 'outbox.json' },
  { value: 'threads', label: 'Threads', hint: 'JSON export' },
  { value: 'nostr', label: 'Nostr', hint: 'JSON array of events' },
];

/** Whether a typed or dragged-in answer names a readable file. */
export function checkInputFile(answer: string): string | null {
  const path = cleanPathInput(answer);
  if (!path) return 'Enter the path to your export file';
  if (!existsSync(path)) return `No such file: ${path}`;
  return statSync(path).isFile() ? null : 'That is a folder; choose the export file inside it';
}

export async function runWizard(tui: Tui): Promise<WizardAnswers> {
  const source = await tui.select('Opal: which export are you converting?', SOURCES);
  const input = cleanPathInput(
    await tui.input('Path to the export file (you can drag it in):', { validate: checkInputFile }),
  );
  const action = await tui.select('What should happen next?', [
    { value: 'preview', label: 'Preview', hint: 'See what would be posted; nothing is sent' },
    { value: 'file', label: 'Convert to a JSON file', hint: 'No sign-in needed' },
    { value: 'publish', label: 'Publish to Bluesky', hint: 'Asks again before posting' },
  ]);

  let output: string | undefined;
  if (action === 'file') {
    output = cleanPathInput(
      await tui.input('Save the converted posts to:', {
        validate: (answer) => (answer.trim() ? null : 'Enter a file name'),
      }),
    );
  }

  return { source, input, output, publish: action !== 'file', preview: action === 'preview' };
}

/** Ask for whichever sign-in details were not given. */
export async function askCredentials(
  tui: Tui,
  given: { handle?: string; password?: string },
): Promise<{ handle: string; password: string }> {
  const required = (what: string) => (answer: string) => (answer.trim() ? null : `Enter ${what}`);
  const handle =
    given.handle ??
    (await tui.input('Bluesky handle or DID:', { validate: required('your handle') })).trim();
  const password =
    given.password ??
    (await tui.input('App password:', { mask: true, validate: required('an app password') }));
  return { handle, password };
}
