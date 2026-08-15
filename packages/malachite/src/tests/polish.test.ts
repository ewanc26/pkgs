/**
 * Unit tests for the polish migration subtool.
 *
 * Tests cover:
 * - Migration plan classification (backfill vs dedupe)
 * - Backfill preserving rkeys and rewriting $type
 * - Legacy cleanup ordering
 * - Failure safety (legacy copies retained)
 * - Dry-run purity (no writes)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Client } from '@atproto/lex';
import { buildPolishPlan, migrateLegacyRecords } from '../lib/polish.js';
import type { PolishPlan } from '../lib/polish.js';

function play(rkey: string, track: string, $type = 'fm.teal.alpha.feed.play') {
  return {
    rkey,
    uri: `at://did:plc:test/${$type}/${rkey}`,
    cid: `bafyrei${rkey}`,
    value: {
      $type,
      trackName: track,
      artists: [{ artistName: 'Test Artist' }],
      playedTime: '2025-01-01T00:00:00Z',
      submissionClientAgent: 'malachite/test',
      musicServiceUri: 'https://example.com',
    },
  };
}

function makeFakeAgent(
  onCreate?: (opts: any) => Promise<unknown>,
  onDelete?: (opts: any) => Promise<unknown>
) {
  const created: any[] = [];
  const deleted: any[] = [];
  const agent = {
    did: 'did:plc:test',
    session: { did: 'did:plc:test' },
    com: {
      atproto: {
        repo: {
          createRecord: async (opts: any) => {
            created.push(opts);
            return onCreate ? onCreate(opts) : { data: {} };
          },
          deleteRecord: async (opts: any) => {
            deleted.push(opts);
            return onDelete ? onDelete(opts) : { data: {} };
          },
        },
      },
    },
  };
  return { agent: agent as unknown as Client, created, deleted };
}

describe('buildPolishPlan', () => {
  it('classifies legacy records by production rkey presence', () => {
    const legacy = [
      play('rkeyA', 'Track A'),
      play('rkeyB', 'Track B'),
      play('rkeyC', 'Track C'),
    ];
    const production = [
      play('rkeyA', 'Track A (prod)', 'fm.teal.feed.play'),
      play('rkeyZ', 'Prod only', 'fm.teal.feed.play'),
    ];

    const plan = buildPolishPlan(legacy, production);

    assert.strictEqual(plan.legacyTotal, 3);
    assert.strictEqual(plan.productionTotal, 2);
    assert.deepStrictEqual(plan.toBackfill.map((r) => r.rkey), ['rkeyB', 'rkeyC']);
    assert.deepStrictEqual(plan.toDedupe.map((r) => r.rkey), ['rkeyA']);
  });

  it('dedupes by rkey even when the production value differs', () => {
    const legacy = [play('rkeyA', 'Track A')];
    const production = [play('rkeyA', 'Track A (different content)', 'fm.teal.feed.play')];

    const plan = buildPolishPlan(legacy, production);

    assert.strictEqual(plan.toDedupe.length, 1);
    assert.strictEqual(plan.toBackfill.length, 0);
  });

  it('returns an empty plan when no legacy records exist', () => {
    const plan = buildPolishPlan([], [play('rkeyA', 'Track A', 'fm.teal.feed.play')]);

    assert.strictEqual(plan.legacyTotal, 0);
    assert.strictEqual(plan.productionTotal, 1);
    assert.strictEqual(plan.toBackfill.length, 0);
    assert.strictEqual(plan.toDedupe.length, 0);
  });
});

describe('migrateLegacyRecords', () => {
  it('backfills into production preserving rkeys, then deletes legacy copies', async () => {
    const legacy = [play('rkeyA', 'Track A'), play('rkeyB', 'Track B')];
    const production = [play('rkeyA', 'Track A (prod)', 'fm.teal.feed.play')];
    const plan = buildPolishPlan(legacy, production);

    const { agent, created, deleted } = makeFakeAgent();
    const result = await migrateLegacyRecords(agent, plan);

    assert.strictEqual(result.backfilled, 1);
    assert.strictEqual(result.deduped, 1);
    assert.strictEqual(result.deleted, 2);
    assert.strictEqual(result.failed, 0);

    assert.strictEqual(created.length, 1);
    assert.strictEqual(created[0].collection, 'fm.teal.feed.play');
    assert.strictEqual(created[0].rkey, 'rkeyB');
    assert.strictEqual(created[0].record.$type, 'fm.teal.feed.play');
    assert.strictEqual(created[0].record.trackName, 'Track B');

    assert.strictEqual(deleted.length, 2);
    assert.ok(deleted.some((d) => d.rkey === 'rkeyA' && d.collection === 'fm.teal.alpha.feed.play'));
    assert.ok(deleted.some((d) => d.rkey === 'rkeyB' && d.collection === 'fm.teal.alpha.feed.play'));
  });

  it('keeps legacy copies when a backfill fails', async () => {
    const legacy = [play('rkeyA', 'Track A')];
    const plan = buildPolishPlan(legacy, []);
    const { agent, created, deleted } = makeFakeAgent(() => {
      throw new Error('boom');
    });

    const result = await migrateLegacyRecords(agent, plan);

    assert.strictEqual(result.backfilled, 0);
    assert.strictEqual(result.failed, 1);
    assert.strictEqual(result.deleted, 0);
    assert.strictEqual(created.length, 1);
    assert.strictEqual(deleted.length, 0);
  });

  it('performs no writes in dry-run', async () => {
    const legacy = [play('rkeyA', 'Track A')];
    const plan = buildPolishPlan(legacy, []);
    const { agent, created, deleted } = makeFakeAgent();

    const result = await migrateLegacyRecords(agent, plan, true);

    assert.strictEqual(result.backfilled, 1);
    assert.strictEqual(result.deleted, 1);
    assert.strictEqual(created.length, 0);
    assert.strictEqual(deleted.length, 0);
  });

  it('handles an empty plan without touching the repo', async () => {
    const plan: PolishPlan = { productionTotal: 0, legacyTotal: 0, toBackfill: [], toDedupe: [] };
    const { agent, created, deleted } = makeFakeAgent();

    const result = await migrateLegacyRecords(agent, plan);

    assert.strictEqual(result.backfilled, 0);
    assert.strictEqual(result.deleted, 0);
    assert.strictEqual(created.length, 0);
    assert.strictEqual(deleted.length, 0);
  });
});
