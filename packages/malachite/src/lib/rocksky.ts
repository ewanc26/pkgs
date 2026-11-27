import type { Client } from '@atproto/lex';
import {
  buildRockskyDedupPlan,
  canWriteRocksky,
  fetchRockskyScrobbles,
  planRockskyCrossPost,
  publishRecords,
  ROCKSKY_PUBLISH_TARGET,
  ROCKSKY_SCROBBLE_TYPE,
  type DedupPlan,
  type RockskyCrossPostPlan,
} from '@ewanc26/croft-click-core';
import type { PlayRecord } from '../types.js';
import * as ui from '../utils/ui.js';
import { log } from '../utils/logger.js';
import { terminalWaitCallbacks } from '../utils/wait-display.js';
import { isImportCancelled } from '../utils/killswitch.js';
import { confirm, isNonInteractive } from '../utils/input.js';

/**
 * Rocksky cross-posting for the CLI (`--rocksky`). Matching and writing live in
 * @ewanc26/croft-click-core and are shared with the web app; this module adds
 * the terminal output and prompts.
 */

/** Stop before doing anything when an OAuth sign-in can't write rocksky scrobbles. */
export async function ensureRockskyAccess(client: Client, dryRun: boolean): Promise<void> {
  if (await canWriteRocksky(client)) return;
  const message =
    `This sign-in doesn't allow writing ${ROCKSKY_SCROBBLE_TYPE} records. ` +
    'Run malachite --oauth-login again to grant it.';
  if (!dryRun) throw new Error(message);
  log.warn(message);
}

export interface CrossPostOptions {
  dryRun: boolean;
  yes: boolean;
  dangerZone: boolean;
  windowMs?: number;
}

/**
 * Write a rocksky scrobble for each play rocksky doesn't have yet: check the
 * repo's existing scrobbles, show the plan, confirm, then publish with the same
 * rate limiting as a teal import.
 */
export async function crossPostToRocksky(
  client: Client,
  plays: PlayRecord[],
  { dryRun, yes, dangerZone, windowMs }: CrossPostOptions
): Promise<void> {
  const plan = await analyzeRockskyCrossPost(client, plays, windowMs);
  if (!plan) return;
  if (plan.toPublish.length === 0) {
    log.success('Rocksky already has every play.');
    return;
  }

  if (!dryRun && !yes) {
    if (isNonInteractive()) {
      throw new Error('Cross-posting to Rocksky requires confirmation. Pass -y/--yes to proceed, or run interactively.');
    }
    if (!(await confirm(`Cross-post ${plan.toPublish.length.toLocaleString()} play(s) to rocksky?`, false))) {
      log.info('Rocksky cross-post cancelled.');
      return;
    }
  }

  log.section('Cross-posting to Rocksky');
  const result = await publishRecords(
    client,
    plan.toPublish,
    dryRun,
    {
      onProgress: () => {},
      onLog: (level, msg) => (level === 'progress' ? log.progress(msg) : log[level](msg)),
      isCancelled: isImportCancelled,
      ...terminalWaitCallbacks(),
    },
    'rocksky',
    dangerZone,
    false,
    ROCKSKY_PUBLISH_TARGET
  );

  if (result.cancelled) {
    log.warn(`Stopped: ${result.successCount.toLocaleString()} scrobble(s) cross-posted`);
  } else if (!dryRun) {
    log.success(`Cross-posted ${result.successCount.toLocaleString()} scrobble(s) to Rocksky`);
    if (result.errorCount > 0) {
      log.warn(`${result.errorCount.toLocaleString()} failed. Run -m polish --rocksky to retry them: it reads teal fresh and writes only Rocksky scrobbles.`);
    }
  }
}

/**
 * Returns null when the scrobbles can't be read, because writing without
 * checking would duplicate every play rocksky already has.
 */
async function analyzeRockskyCrossPost(
  client: Client,
  plays: PlayRecord[],
  windowMs?: number
): Promise<RockskyCrossPostPlan | null> {
  log.section('Rocksky Check');
  ui.startSpinner('📦 Fetching Rocksky scrobbles via CAR export...');
  let existing: Awaited<ReturnType<typeof fetchRockskyScrobbles>>;
  try {
    existing = await fetchRockskyScrobbles(client);
  } catch (err) {
    ui.failSpinner('Could not read Rocksky scrobbles');
    log.warn((err as Error).message);
    log.warn('Skipping the Rocksky cross-post: writing without checking would duplicate plays Rocksky already has.');
    log.blank();
    return null;
  }
  ui.succeedSpinner(`Found ${existing.length.toLocaleString()} existing Rocksky scrobble(s)`);

  const plan = planRockskyCrossPost(plays, existing, windowMs ? { windowMs } : {});
  log.info(`Already in Rocksky: ${plan.alreadyInRocksky.toLocaleString()}`);
  if (plan.duplicates > 0) {
    log.info(`Near-duplicate plays folded together: ${plan.duplicates.toLocaleString()}`);
  }
  if (plan.incomplete > 0) {
    log.warn(`Skipped, no artist, title or valid time: ${plan.incomplete.toLocaleString()}`);
  }
  log.info(`To cross-post: ${plan.toPublish.length.toLocaleString()}`);
  log.blank();
  return plan;
}

/** Build a dedup plan for the repo's rocksky scrobbles, kept apart from teal's. */
export async function analyzeRockskyDuplicates(
  client: Client,
  opts: { windowMs?: number } = {}
): Promise<DedupPlan> {
  ui.startSpinner('📦 Fetching Rocksky scrobbles via CAR export...');
  let scrobbles: Awaited<ReturnType<typeof fetchRockskyScrobbles>>;
  try {
    scrobbles = await fetchRockskyScrobbles(client);
  } catch (err) {
    ui.failSpinner('Could not read Rocksky scrobbles');
    throw err;
  }
  ui.succeedSpinner(`Found ${scrobbles.length.toLocaleString()} Rocksky scrobble(s)`);
  return buildRockskyDedupPlan(scrobbles, opts);
}
