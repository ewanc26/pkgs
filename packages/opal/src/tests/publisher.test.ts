import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '@atproto/lex';
import { publishRecords } from '../publisher.js';
import type { MicroblogPost } from '../types.js';

const posts = Array.from({ length: 3 }, (_, n) => ({
  originalId: `post-${n}`,
  text: `Post ${n}`,
  createdAt: new Date(Date.UTC(2025, 0, 1, 0, n)).toISOString(),
})) as MicroblogPost[];

describe('opal publisher through a 429', () => {
  it('resends the refused posts instead of skipping them', async () => {
    const sent: string[][] = [];
    const client = {
      assertDid: 'did:plc:test',
      xrpc: async (_m: unknown, { body }: { body: { writes: { value: { text: string } }[] } }) => {
        sent.push(body.writes.map((w) => w.value.text));
        if (sent.length === 1) {
          throw Object.assign(new Error('Rate Limit Exceeded'), {
            status: 429,
            headers: new Headers({ 'retry-after': '3600' }),
          });
        }
        return {
          headers: new Headers(),
          body: { results: body.writes.map((_, i) => ({ uri: `at://x/${i}`, cid: 'c' })) },
        };
      },
    } as unknown as Client;

    const result = await publishRecords(client, posts, false, {
      onProgress: () => {},
      onLog: () => {},
      isCancelled: () => false,
      retryNow: () => true,
    });

    assert.deepEqual(result, { successCount: 3, errorCount: 0, cancelled: false });
    assert.deepEqual(sent[1], sent[0]);
  });
});
