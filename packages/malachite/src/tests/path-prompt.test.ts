import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanPathInput, promptPath } from '../utils/input.js';

describe('file path prompts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'malachite-path-'));
  const file = path.join(dir, 'My Export.csv');
  fs.writeFileSync(file, '');

  const answers = (...replies: string[]) => async () => replies.shift()!;

  it('accepts a dragged-in path, quoted or escaped', () => {
    assert.strictEqual(cleanPathInput(`'${file}' `, 'darwin'), file);
    assert.strictEqual(cleanPathInput(`${file.replace(/ /g, '\\ ')} `, 'darwin'), file);
    assert.strictEqual(cleanPathInput('~/x.csv', 'darwin'), `${os.homedir()}/x.csv`);
    assert.strictEqual(cleanPathInput('C:\\data\\x.csv', 'win32'), 'C:\\data\\x.csv');
  });

  it('lets an optional prompt be skipped with Enter', async () => {
    assert.strictEqual(await promptPath('?', 'csv', { optional: true, ask: answers('') }), '');
  });

  it('asks again until a required path is valid', async () => {
    assert.strictEqual(await promptPath('?', 'csv', { ask: answers('', 'nope.csv', file) }), file);
  });
});
