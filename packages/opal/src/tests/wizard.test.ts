import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Tui } from '@ewanc26/tui';
import { askCredentials, checkInputFile, runWizard } from '../wizard.js';

const dir = mkdtempSync(join(tmpdir(), 'opal-'));
const file = join(dir, 'out box.json');
writeFileSync(file, '[]');

/** An interface that answers questions from a script and records how they were asked. */
function scripted(answers: string[]) {
  const asked: { message: string; mask?: boolean }[] = [];
  const tui = {
    select: async (message: string) => (asked.push({ message }), answers.shift()),
    input: async (message: string, options?: { mask?: boolean }) => {
      asked.push({ message, mask: options?.mask });
      return answers.shift();
    },
  } as unknown as Tui;
  return { tui, asked };
}

describe('opal wizard', () => {
  it('rejects missing files and folders, and accepts a dragged-in path', () => {
    assert.match(checkInputFile('')!, /Enter the path/);
    assert.match(checkInputFile(join(dir, 'nope'))!, /No such file/);
    assert.match(checkInputFile(dir)!, /folder/);
    assert.equal(checkInputFile(`'${file}' `), null);
  });

  it('previews without asking for a file to save', async () => {
    const { tui, asked } = scripted(['mastodon', `'${file}'`, 'preview']);
    assert.deepEqual(await runWizard(tui), {
      source: 'mastodon', input: file, output: undefined, publish: true, preview: true,
    });
    assert.equal(asked.length, 3);
  });

  it('asks only for the missing sign-in details, masking the password', async () => {
    const { tui, asked } = scripted(['secret']);
    assert.deepEqual(await askCredentials(tui, { handle: 'a.example' }), {
      handle: 'a.example', password: 'secret',
    });
    assert.deepEqual(asked, [{ message: 'App password:', mask: true }]);
  });
});
