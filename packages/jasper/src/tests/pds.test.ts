import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@atproto/lex';
import { RateLimiter } from '@ewanc26/croft-click-core';
import { uploadBlob, withRateLimitRetry } from '../lib/pds.js';

const CID = 'bafkreibme22gw2h7y2h7tg2fhqotaqjucnbc24deqo72b6mkl2egezxhvy';

/** A real lex Client over a stub session, so requests take their real path. */
function stubClient(responses: Response[]) {
  const paths: string[] = [];
  const client = new Client({
    did: 'did:plc:test',
    fetchHandler: async (path: string) => {
      paths.push(path);
      return responses.shift()!;
    },
  });
  return { client, paths };
}

const uploaded = () =>
  Response.json({ blob: { $type: 'blob', ref: { $link: CID }, mimeType: 'image/jpeg', size: 3 } });

describe('jasper PDS access', () => {
  it('uploads blobs through the signed-in session', async () => {
    const { client, paths } = stubClient([uploaded()]);
    const blob = await uploadBlob(client, new Uint8Array([1, 2, 3]), 'image/jpeg');
    assert.deepEqual(blob, { cid: CID, mimeType: 'image/jpeg', size: 3 });
    assert.deepEqual(paths, ['/xrpc/com.atproto.repo.uploadBlob']);
  });

  it('waits out a 429 and sends the request again', async () => {
    const refused = Response.json(
      { error: 'RateLimitExceeded', message: 'Rate Limit Exceeded' },
      { status: 429, headers: { 'retry-after': '3600' } },
    );
    const { client, paths } = stubClient([refused, uploaded()]);
    const waits: number[] = [];
    const limited = withRateLimitRetry(client, new RateLimiter(), {
      onWait: (info) => waits.push(info.totalWaitSeconds),
      retryNow: () => true,
    });

    const blob = await uploadBlob(limited, new Uint8Array([1, 2, 3]), 'image/jpeg');

    assert.equal(blob.cid, CID);
    assert.equal(paths.length, 2);
    assert.ok(waits[0]! >= 3600, `honours Retry-After (got ${waits[0]}s)`);
  });
});
