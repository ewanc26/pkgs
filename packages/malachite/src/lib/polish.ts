import type { AtpAgent } from '@atproto/api';
import type { SingleBar } from 'cli-progress';
import { RECORD_TYPE, LEGACY_RECORD_TYPE } from '../config.js';
import { formatDate } from '../utils/helpers.js';
import * as ui from '../utils/ui.js';
import { log } from '../utils/logger.js';
import {
  analyzeLegacyRecords as coreAnalyze,
  migrateLegacyRecords as coreMigrate,
} from '@ewanc26/croft-click-core';
import type { PolishPlan, PolishResult } from '@ewanc26/croft-click-core';

export type { PolishPlan, PolishResult, PolishRecord } from '@ewanc26/croft-click-core';
export { buildPolishPlan } from '@ewanc26/croft-click-core';

/**
 * Teal migration polish subtool.
 *
 * Moves legacy `fm.teal.alpha.feed.play` scrobbles into the production
 * `fm.teal.feed.play` collection, then cleans up the legacy copies.
 *
 * (No, this has nothing to do with the Polish language — it's for polishing
 * your scrobble history into its shiny new production namespace.)
 *
 * The fetch / plan / write logic lives in @ewanc26/croft-click-core and is
 * shared with the web frontend; this module adds the CLI display layer.
 */

/**
 * Fetch both collections via CAR and build a migration plan.
 * Read-only — performs no writes.
 */
export async function analyzeLegacyRecords(agent: AtpAgent): Promise<PolishPlan> {
  log.section('Analyzing Legacy Records');
  const start = Date.now();

  ui.startSpinner('📦 Fetching repo via CAR export...');
  let plan: PolishPlan;
  try {
    plan = await coreAnalyze(agent);
  } catch (err) {
    ui.failSpinner('Failed to fetch repo via CAR export');
    throw err;
  }

  ui.succeedSpinner(
    `Fetched ${plan.legacyTotal.toLocaleString()} legacy + ${plan.productionTotal.toLocaleString()} production records in ${((Date.now() - start) / 1000).toFixed(1)}s`
  );
  return plan;
}

/**
 * Display a human-readable summary of a migration plan.
 */
export function displayPolishPlan(plan: PolishPlan, dryRun = false): void {
  log.section(dryRun ? 'Polish Preview (DRY RUN)' : 'Polish Plan');
  log.info(`Production records (${RECORD_TYPE}): ${plan.productionTotal.toLocaleString()}`);
  log.info(`Legacy records (${LEGACY_RECORD_TYPE}): ${plan.legacyTotal.toLocaleString()}`);
  log.blank();
  log.info(`To backfill into production: ${plan.toBackfill.length.toLocaleString()}`);
  log.info(`Already in production (dedupe): ${plan.toDedupe.length.toLocaleString()}`);
  log.blank();

  if (plan.toBackfill.length > 0) {
    const exampleCount = Math.min(3, plan.toBackfill.length);
    log.info('Examples of records to backfill:');
    plan.toBackfill.slice(0, exampleCount).forEach((record, i) => {
      log.info(`  ${i + 1}. ${formatPlay(record.value)}`);
    });
    if (plan.toBackfill.length > exampleCount) {
      log.info(`  ... and ${(plan.toBackfill.length - exampleCount).toLocaleString()} more`);
    }
    log.blank();
  }

  if (plan.toDedupe.length > 0) {
    log.info('Deduplication by rkey — production namespace is prioritized.');
    log.info(`  ${plan.toDedupe.length.toLocaleString()} legacy record(s) will be removed (production already has the rkey).`);
    log.blank();
  }

  if (dryRun) {
    log.info('DRY RUN: No changes were made.');
  }
}

function formatPlay(value: Record<string, unknown>): string {
  const artist = (value as { artists?: { artistName?: string }[] })?.artists?.[0]?.artistName ?? 'Unknown Artist';
  const track = (value as { trackName?: string })?.trackName ?? 'Unknown Track';
  const played = (value as { playedTime?: string })?.playedTime;
  const when = played ? formatDate(played, true) : 'unknown time';
  return `${artist} - ${track} (${when})`;
}

/**
 * Execute a migration plan: backfill missing legacy records into the
 * production collection (preserving rkeys), then delete the legacy copies.
 *
 * Backfill failures are reported and their legacy copies are retained so no
 * data is ever lost — re-running polish will finish the job.
 */
export async function migrateLegacyRecords(
  agent: AtpAgent,
  plan: PolishPlan,
  dryRun = false
): Promise<PolishResult> {
  const start = Date.now();
  const bars = {
    backfill: plan.toBackfill.length > 0 ? ui.createProgressBar(plan.toBackfill.length, 'Backfilling') : null,
    delete: null as SingleBar | null,
  };

  if (bars.backfill) {
    log.section('Backfilling Production Records');
  }

  // cli-progress renders nothing meaningful when stdout isn't a TTY (CI,
  // piped/redirected output, --non-interactive runs) — fall back to explicit,
  // throttled log lines so progress is actually visible in that context.
  const isTTY = Boolean(process.stdout.isTTY);
  let lastLogAt = 0;
  const logProgressLine = (phase: 'backfill' | 'delete', done: number, total: number) => {
    if (isTTY || total === 0) return;
    const now = Date.now();
    if (done < total && now - lastLogAt < 5000) return; // throttle to ~5s; always emit the final line
    lastLogAt = now;
    const pct = ((done / total) * 100).toFixed(1);
    const elapsed = ((now - start) / 1000).toFixed(0);
    const label = phase === 'backfill' ? 'Backfilling' : 'Removing legacy';
    log.info(`${label}: ${done.toLocaleString()}/${total.toLocaleString()} (${pct}%) — ${elapsed}s elapsed`);
  };

  const result = await coreMigrate(agent, plan, {
    dryRun,
    onProgress: (phase, done, total) => {
      if (phase === 'backfill') {
        bars.backfill?.update(done, {});
      } else {
        if (!bars.delete) {
          log.section('Removing Legacy Records');
          bars.delete = ui.createProgressBar(total, 'Removing legacy');
        }
        bars.delete.update(done, {});
      }
      logProgressLine(phase, done, total);
    },
  });

  if (bars.backfill) {
    bars.backfill.stop();
    console.log('');
    log.success(`Backfilled ${result.backfilled.toLocaleString()} record(s) into ${RECORD_TYPE}`);
    if (result.failed > 0) {
      log.warn(`${result.failed.toLocaleString()} backfill(s) failed — their legacy copies were kept.`);
    }
    log.blank();
  }

  if (result.deleted > 0) {
    bars.delete?.stop();
    console.log('');
    log.success(`Removed ${result.deleted.toLocaleString()} legacy record(s) from ${LEGACY_RECORD_TYPE}`);
    log.blank();
  }

  if (plan.legacyTotal > 0) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log.section('Polish Summary');
    log.info(`Backfilled: ${result.backfilled.toLocaleString()}`);
    log.info(`Deduped (already in production): ${result.deduped.toLocaleString()}`);
    log.info(`Legacy removed: ${result.deleted.toLocaleString()}`);
    if (result.failed > 0) {
      log.warn(`Failed: ${result.failed.toLocaleString()} (legacy copies retained)`);
    }
    log.info(`Completed in ${elapsed}s`);
  }

  return result;
}
