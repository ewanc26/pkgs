/**
 * @fileoverview Fully Dynamic Rate Limiter - Zero Hardcoded Defaults
 * 
 * This module provides intelligent rate limit management for AT Protocol record publishing.
 * Unlike traditional rate limiters that require manual configuration, this implementation:
 * 
 * 1. **Learns Server Capacity**: Discovers limits from first response headers
 * 2. **Tracks Real-Time Quota**: Monitors remaining points continuously
 * 3. **Enforces Headroom Buffer**: Preserves safety margin to prevent exhaustion
 * 4. **Persists State**: Saves state across restarts for consistent behavior
 * 5. **Auto-Recovery**: Detects and handles quota resets automatically
 * 
 * DESIGN PHILOSOPHY:
 * - NO ASSUMPTIONS: Every PDS configuration is learned dynamically
 * - SAFETY FIRST: 15% headroom buffer prevents rate limit hits
 * - STATE PERSISTENCE: Resume support with saved server capacity
 * - TRANSPARENT OPERATION: Clear logging of all decisions
 * 
 * TYPICAL FLOW:
 * 
 * First Run:
 *   1. No saved state exists
 *   2. Return 0 quota (forces conservative probe)
 *   3. Receive first response headers
 *   4. Learn: "5000 points/3600s window"
 *   5. Save state to ~/.ewanc26/malachite/state/rate-limit.json
 *   6. Provide full quota for subsequent requests
 * 
 * Subsequent Runs:
 *   1. Load saved state (5000 points/3600s)
 *   2. Check remaining quota (e.g., 4200)
 *   3. Calculate safe quota: 4200 - (5000 × 0.15) = 3450
 *   4. Provide safe quota for batch sizing
 *   5. Update state after each request
 * 
 * Quota Exhaustion:
 *   1. Remaining drops below headroom (750 for 5000 limit)
 *   2. Return 0 safe quota
 *   3. Wait for reset timestamp
 *   4. Auto-restore to full quota
 *   5. Resume at maximum speed
 * 
 * STATE FILE FORMAT:
 * ```json
 * {
 *   "limit": 5000,              // Server capacity
 *   "remaining": 3240,          // Current quota
 *   "resetAt": 1738938600,      // Reset timestamp (unix seconds)
 *   "windowSeconds": 3600,      // Window duration
 *   "updatedAt": 1738935780,    // Last update timestamp
 *   "headroomThreshold": 0.15   // Safety buffer (15%)
 * }
 * ```
 * 
 * HEADROOM BUFFER:
 * The 15% headroom buffer prevents quota exhaustion:
 * - Without headroom: Risk hitting 0 and triggering rate limits
 * - With headroom: Stop at 750 points (15% of 5000), wait for reset
 * - Result: Never actually hit rate limits, always maintain buffer
 * 
 * @module rate-limiter
 */

import fs from 'node:fs';
import path from 'node:path';
import { getMalachiteStateDir } from './platform.js';
import { rateLimitBackoffSeconds, type HeadersInput } from '@ewanc26/croft-click-core';
import { parseRateLimitHeaders, normalizeHeaders } from './rate-limit-headers.js';
import { sleepWithCountdown } from './wait-display.js';
import { isImportCancelled } from './killswitch.js';
import { log } from './logger.js';

/**
 * Rate limit state structure persisted to disk.
 * All timestamps are in Unix seconds (not milliseconds).
 */
export interface RateLimitState {
  /** Maximum points allowed in the time window (learned from server) */
  limit: number;
  
  /** Points remaining in current window (actual server value, not adjusted) */
  remaining: number;
  
  /** Unix timestamp (seconds) when the window resets */
  resetAt: number;
  
  /** Window duration in seconds (learned from server policy, typically 3600) */
  windowSeconds: number;
  
  /** Unix timestamp (seconds) when this state was last updated */
  updatedAt: number;
  
  /** Headroom threshold - fraction of limit to preserve as buffer (0.0-1.0) */
  headroomThreshold: number;
}

/**
 * RateLimiter - Intelligent rate limit management with server discovery
 * 
 * CORE CONCEPTS:
 * 
 * 1. **Actual vs Safe Quota**:
 *    - Actual: What the server reports (e.g., 800 points)
 *    - Safe: Actual minus headroom buffer (e.g., 800 - 750 = 50 points)
 *    - We use safe quota for decisions to maintain the buffer
 * 
 * 2. **Headroom Buffer**:
 *    - Default: 15% of server limit
 *    - Purpose: Prevent quota exhaustion before hitting 0
 *    - Example: 5000 limit → 750 point buffer
 *    - When remaining drops to 750, we stop and wait
 * 
 * 3. **State Persistence**:
 *    - Saved after every update to disk
 *    - Allows resuming with known server capacity
 *    - Survives process restarts
 * 
 * 4. **Auto-Recovery**:
 *    - Detects when current time >= resetAt
 *    - Automatically restores remaining to limit
 *    - No manual intervention needed
 * 
 * INITIALIZATION:
 * ```typescript
 * // Default 15% headroom
 * const rl = new RateLimiter();
 * 
 * // Custom headroom (10%)
 * const rl = new RateLimiter({ headroom: 0.10 });
 * ```
 * 
 * TYPICAL USAGE:
 * ```typescript
 * // Check if we have quota
 * const hasQuota = await rl.checkQuota(600); // Need 600 points
 * 
 * // Reserve quota (waits if exhausted)
 * await rl.waitForPermit(600);
 * 
 * // Get safe available points for batch sizing
 * const safePoints = rl.getSafeAvailablePoints();
 * 
 * // Update from server response
 * rl.updateFromHeaders(response.headers);
 * ```
 * 
 * LEARNING FLOW:
 * ```typescript
 * // First request - no state exists
 * rl.getSafeAvailablePoints(); // Returns 0
 * 
 * // Send probe batch
 * const response = await sendBatch(10 records);
 * 
 * // Learn from response
 * rl.updateFromHeaders(response.headers);
 * // Logs: "🎓 LEARNED: 5000 points/3600s"
 * 
 * // Now we know the capacity
 * rl.getSafeAvailablePoints(); // Returns 4250 (5000 - 750 headroom)
 * ```
 */
export class RateLimiter {
  /** Path to persisted state file */
  private stateFile: string;

  /**
   * Path to the persisted 429 block. Kept apart from the capacity state so a
   * refusal without quota headers never invents a server capacity.
   */
  private blockFile: string;
  
  /** Headroom threshold as fraction of limit (default 0.15 = 15%) */
  private headroomThreshold: number;
  
  /** Flag tracking whether we've learned server capacity yet */
  private hasLearnedFromServer: boolean = false;
  
  /**
   * Initialize rate limiter with optional custom headroom.
   * 
   * INITIALIZATION STEPS:
   * 1. Set headroom threshold (default 15%)
   * 2. Determine state file path (~/.ewanc26/malachite/state/rate-limit.json)
   * 3. Ensure state directory exists
   * 4. Check for existing state (from previous runs)
   * 5. REBUILD CACHE: Validate and refresh state based on elapsed time
   * 6. Set hasLearnedFromServer flag if state exists
   * 
   * @param opts Configuration options
   * @param opts.headroom Headroom threshold (0.0-1.0, default 0.15 = 15%)
   */
  private isCancelled: () => boolean;

  constructor(opts?: { headroom?: number; isCancelled?: () => boolean }) {
    this.isCancelled = opts?.isCancelled ?? isImportCancelled;
    this.headroomThreshold = opts?.headroom ?? 0.15; // Default 15% headroom
    const stateDir = path.join(getMalachiteStateDir(), 'state');
    this.stateFile = path.join(stateDir, 'rate-limit.json');
    this.blockFile = path.join(stateDir, 'rate-limit-block.json');
    
    log.info(`[RateLimiter] 💾 State file: ${this.stateFile}`);
    log.info(`[RateLimiter] 🛡️ Headroom: ${(this.headroomThreshold * 100).toFixed(0)}% buffer before pausing`);
    this.ensureStateDir();
    
    // Check if we already have server info from previous runs
    const state = this.readState();
    if (state && state.limit > 0) {
      this.hasLearnedFromServer = true;
      log.info(`[RateLimiter] ℹ️  Found saved state: ${state.limit} points/${state.windowSeconds}s window`);
      
      // REBUILD CACHE: Refresh state based on time elapsed since last run
      this.rebuildCacheOnRestart(state);
    } else {
      log.info(`[RateLimiter] 🔍 No saved state - will learn from first server response`);
    }
  }
  
  /**
   * Rebuild cache on restart by validating and refreshing quota state.
   * Called during initialization to ensure state reflects any quota regeneration
   * that occurred while the app was not running.
   * 
   * REBUILD LOGIC:
   * 1. Check if window has fully reset (now >= resetAt)
   *    - If yes: Restore quota to full capacity
   * 2. If in sliding window, calculate quota regeneration
   *    - Points regenerate at: limit / windowSeconds per second
   *    - Regenerated = (time_elapsed × regeneration_rate)
   *    - New quota = min(limit, old_remaining + regenerated)
   * 3. Update resetAt if needed
   * 4. Save refreshed state to disk
   * 
   * This ensures we start with accurate quota on every restart.
   * 
   * @param state The loaded state from disk
   */
  private rebuildCacheOnRestart(state: RateLimitState): void {
    const now = Math.floor(Date.now() / 1000);
    const oldRemaining = state.remaining;
    
    // Check if window has completely reset
    if (now >= state.resetAt) {
      const timeSinceReset = now - state.resetAt;
      state.remaining = state.limit;
      state.resetAt = now + state.windowSeconds;
      state.updatedAt = now;
      
      log.info(`[RateLimiter] 🔄 CACHE REBUILD: Window reset ${timeSinceReset}s ago`);
      log.info(`[RateLimiter] ✅ Quota restored to full capacity: ${state.limit} points`);
      this.writeState(state);
      return;
    }
    
    // Calculate quota regeneration in sliding window
    const timeElapsed = now - state.updatedAt;
    
    if (timeElapsed > 0) {
      // In a sliding window, points regenerate at the same rate they're consumed
      const regenerationRate = state.limit / state.windowSeconds; // points per second
      const regeneratedPoints = Math.floor(timeElapsed * regenerationRate);
      
      // New remaining cannot exceed limit
      const newRemaining = Math.min(state.limit, state.remaining + regeneratedPoints);
      
      if (newRemaining > state.remaining) {
        state.remaining = newRemaining;
        state.updatedAt = now;
        
        const percentNow = (newRemaining / state.limit * 100).toFixed(1);
        log.info(`[RateLimiter] 🔄 CACHE REBUILD: ${timeElapsed}s elapsed during downtime`);
        log.info(`[RateLimiter] ✅ Regenerated ${regeneratedPoints} points: ${oldRemaining} → ${newRemaining} (${percentNow}%)`);
        log.debug(`[RateLimiter] Regeneration rate: ${regenerationRate.toFixed(3)} points/second`);
        
        this.writeState(state);
      } else {
        log.debug(`[RateLimiter] 🔄 CACHE REBUILD: ${timeElapsed}s elapsed, quota unchanged at ${state.remaining}/${state.limit}`);
      }
    } else {
      log.debug(`[RateLimiter] 🔄 CACHE REBUILD: State is current (updated ${state.updatedAt})`);
    }
    
    // Log current status
    const percentRemaining = (state.remaining / state.limit * 100).toFixed(1);
    const timeUntilReset = state.resetAt - now;
    log.info(`[RateLimiter] 📊 Current quota: ${state.remaining}/${state.limit} (${percentRemaining}%), resets in ${timeUntilReset}s`);
  }
  
  /**
   * Ensure state directory exists, creating it if necessary.
   * Called during initialization and before writing state.
   */
  private ensureStateDir(): void {
    const dir = path.dirname(this.stateFile);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log.debug(`[RateLimiter] Created state directory: ${dir}`);
      }
    } catch (error) {
      log.error(`[RateLimiter] ❌ Failed to create state directory: ${error}`);
      throw error;
    }
  }
  
  /**
   * Read rate limit state from disk.
   * 
   * RETURNS:
   * - RateLimitState object if file exists and is valid JSON
   * - null if file doesn't exist or can't be parsed
   * 
   * @returns Persisted state or null
   */
  private readState(): RateLimitState | null {
    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      const state = JSON.parse(raw) as RateLimitState;
      log.debug(`[RateLimiter] Loaded state: limit=${state.limit}, remaining=${state.remaining}, window=${state.windowSeconds}s`);
      return state;
    } catch (e) {
      log.debug(`[RateLimiter] No existing state file`);
      return null;
    }
  }
  
  /**
   * Write rate limit state to disk.
   * 
   * EFFECTS:
   * - Ensures state directory exists
   * - Writes JSON to state file
   * - Sets hasLearnedFromServer flag on first successful write with capacity
   * - Logs detailed state information
   * 
   * @param state State to persist
   * @throws Error if write fails
   */
  private writeState(state: RateLimitState): void {
    try {
      this.ensureStateDir();
      const stateJson = JSON.stringify(state, null, 2);
      fs.writeFileSync(this.stateFile, stateJson, 'utf8');
      
      // Log when we first learn server capacity
      if (!this.hasLearnedFromServer && state.limit > 0) {
        this.hasLearnedFromServer = true;
        log.info(`[RateLimiter] ✅ Learned from server: ${state.limit} points/${state.windowSeconds}s window`);
      }
      
      log.debug(`[RateLimiter] State saved: limit=${state.limit}, remaining=${state.remaining}, resets=${new Date(state.resetAt * 1000).toISOString()}`);
    } catch (error) {
      log.error(`[RateLimiter] ❌ Failed to write state: ${error}`);
      throw error;
    }
  }
  
  /**
   * Update rate limit state from server response headers.
   * This is how we LEARN the server's configuration dynamically.
   * 
   * LEARNING PROCESS:
   * 1. Parse headers (limit, remaining, reset, window)
   * 2. Validate required fields (limit and remaining must exist)
   * 3. Calculate reset time (from header or estimated)
   * 4. Create new state with actual server values
   * 5. Log learning message on first discovery
   * 6. Save state to disk
   * 
   * IMPORTANT: We store the ACTUAL remaining from the server,
   * not adjusted by headroom. Headroom is applied only when
   * checking or reserving quota, not when storing state.
   * 
   * HEADER FORMATS SUPPORTED:
   * - Standard: ratelimit-limit, ratelimit-remaining, ratelimit-reset
   * - X-Prefixed: x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset
   * - Policy: ratelimit-policy (format: "5000;w=3600")
   * 
   * EXAMPLE:
   * ```typescript
   * const headers = {
   *   'ratelimit-limit': '5000',
   *   'ratelimit-remaining': '4970',
   *   'ratelimit-reset': '1738938600',
   *   'ratelimit-policy': '5000;w=3600'
   * };
   * rl.updateFromHeaders(headers);
   * // Logs: "🎓 LEARNED: 5000 points/3600s, currently 4970 remaining (99.4%)"
   * ```
   * 
   * @param headers Response headers from server (should be normalized)
   */
  updateFromHeaders(headers: HeadersInput): void {
    // A live response supersedes any earlier refusal.
    if (this.learn(headers)) this.noteSuccess();
  }

  /** Record that a request succeeded, ending any 429 block and its backoff. */
  noteSuccess(): void {
    fs.rmSync(this.blockFile, { force: true });
  }

  /** Absorb quota headers. Returns false when they carry no usable reading. */
  private learn(headers: HeadersInput): boolean {
    const normalizedHeaders = normalizeHeaders(headers);
    const parsed = parseRateLimitHeaders(normalizedHeaders);
    
    if (!parsed.limit || parsed.remaining === undefined) {
      log.debug('[RateLimiter] Headers missing limit/remaining - cannot learn from server');
      return false;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const windowSeconds = parsed.windowSeconds || 3600;
    // ratelimit-reset is a delta in seconds per the IETF draft, but some
    // servers send an epoch timestamp — in seconds OR milliseconds. A 13-digit
    // epoch-ms value classified as epoch seconds lands ~55,000 years in the
    // future, wedging waitForReset (and the persisted state file) forever.
    let resetAt =
      parsed.reset === undefined
        ? now + windowSeconds
        : parsed.reset >= 1e12
          ? Math.floor(parsed.reset / 1000)
          : parsed.reset >= 1_000_000_000
            ? parsed.reset
            : now + parsed.reset;
    // Defence in depth: clamp implausible far-future resets to one window so a
    // garbage header can never produce an effectively unbounded wait.
    if (resetAt > now + 2 * windowSeconds) {
      log.warn(`[RateLimiter] ⚠️  Implausible reset timestamp clamped to one ${windowSeconds}s window`);
      resetAt = now + windowSeconds;
    }
    
    const state: RateLimitState = {
      limit: parsed.limit,
      remaining: parsed.remaining, // Store actual server value
      resetAt,
      windowSeconds,
      updatedAt: now,
      headroomThreshold: this.headroomThreshold
    };
    
    const headroomPoints = Math.floor(parsed.limit * this.headroomThreshold);
    const percentRemaining = ((parsed.remaining / parsed.limit) * 100).toFixed(1);
    
    // Special logging for first-time discovery
    if (!this.hasLearnedFromServer) {
      log.info(`[RateLimiter] 🎓 LEARNED: ${parsed.limit} points/${windowSeconds}s, currently ${parsed.remaining} remaining (${percentRemaining}%)`);
    } else {
      log.debug(`[RateLimiter] Updated: ${parsed.remaining}/${parsed.limit} (${percentRemaining}%), resets ${new Date(resetAt * 1000).toISOString()}`);
    }
    
    // Warn if approaching headroom threshold
    if (parsed.remaining <= headroomPoints) {
      log.warn(`[RateLimiter] ⚠️  Near headroom threshold! ${parsed.remaining} ≤ ${headroomPoints} (${(this.headroomThreshold * 100).toFixed(0)}%)`);
    }
    
    this.writeState(state);
    return true;
  }
  
  /**
   * Check if we have enough quota for the requested points.
   * Does not modify state - use reserveQuota to actually reserve points.
   * 
   * ALGORITHM:
   * 1. Read current state
   * 2. Check if window has reset (auto-restore quota)
   * 3. Calculate effective remaining (actual - headroom)
   * 4. Compare with requested points
   * 
   * HEADROOM APPLICATION:
   * effective = remaining - (limit × threshold)
   * Example: 800 - (5000 × 0.15) = 800 - 750 = 50
   * 
   * RETURNS:
   * - true if effective remaining >= pointsNeeded
   * - true if no state yet (first request)
   * - false if insufficient quota
   * 
   * @param pointsNeeded Number of points required
   * @returns Whether quota is available
   */
  async checkQuota(pointsNeeded: number): Promise<boolean> {
    const state = this.readState();
    if (!state) {
      // No state yet - let first request through so we can learn
      log.debug('[RateLimiter] No state - allowing first request to learn from server');
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // Auto-restore if window has reset
    if (now >= state.resetAt) {
      log.info(`[RateLimiter] 🔄 Window reset! Quota restored to ${state.limit}`);
      state.remaining = state.limit;
      state.resetAt = now + state.windowSeconds;
      state.updatedAt = now;
      this.writeState(state);
      return true;
    }
    
    // Calculate effective remaining with headroom buffer
    const headroomPoints = Math.floor(state.limit * this.headroomThreshold);
    const effectiveRemaining = state.remaining - headroomPoints;
    const hasQuota = effectiveRemaining >= pointsNeeded;
    
    if (!hasQuota) {
      const percentRemaining = ((state.remaining / state.limit) * 100).toFixed(1);
      log.debug(`[RateLimiter] Insufficient quota: need ${pointsNeeded}, have ${state.remaining} (${percentRemaining}%), preserving ${headroomPoints} headroom`);
    }
    
    return hasQuota;
  }
  
  /**
   * Reserve quota points before making a request.
   * Actually decrements the remaining count in state.
   * 
   * ALGORITHM:
   * 1. Read current state
   * 2. Check if window has reset (auto-restore)
   * 3. Check the batch fits above the headroom buffer
   * 4. If sufficient: decrement remaining and save state
   * 
   * RETURNS:
   * - true if quota reserved successfully
   * - true if no state yet (first request)
   * - false if insufficient actual quota
   * 
   * IMPORTANT: This MODIFIES state by decrementing remaining.
   * Only call this when you're about to make the request.
   * 
   * @param pointsNeeded Number of points to reserve
   * @returns Whether reservation succeeded
   */
  async reserveQuota(pointsNeeded: number): Promise<boolean> {
    const state = this.readState();
    if (!state) {
      // No state yet - let it through so we can learn
      log.debug('[RateLimiter] No state - allowing request to establish baseline');
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // Auto-restore if window reset
    if (now >= state.resetAt) {
      log.info(`[RateLimiter] 🔄 Window reset detected during reservation`);
      state.remaining = state.limit;
      state.resetAt = now + state.windowSeconds;
      state.updatedAt = now;
      this.writeState(state);
    }
    
    // Keep the headroom buffer. A full window is always usable, so a batch
    // larger than the buffered quota can never wait forever.
    const headroomPoints = Math.floor(state.limit * this.headroomThreshold);
    if (state.remaining < state.limit && state.remaining - headroomPoints < pointsNeeded) {
      log.debug(`[RateLimiter] Need ${pointsNeeded}, have ${state.remaining}, preserving ${headroomPoints}`);
      return false;
    }
    
    // Reserve the quota by decrementing remaining
    state.remaining -= pointsNeeded;
    state.updatedAt = now;
    this.writeState(state);
    
    log.debug(`[RateLimiter] ✅ Reserved ${pointsNeeded} points, ${state.remaining} remaining`);
    return true;
  }
  
  /**
   * Wait until the rate limit window resets, showing a countdown. Resolves early
   * on cancellation or when the user asks to try again.
   */
  async waitForReset(): Promise<void> {
    const state = this.readState();
    if (!state) {
      log.debug('[RateLimiter] No state - nothing to wait for');
      return;
    }
    if (Math.floor(Date.now() / 1000) >= state.resetAt) return;

    await sleepWithCountdown({
      resumeAt: (state.resetAt + 1) * 1000,
      reason: `Quota used up to the safety margin (${state.remaining}/${state.limit} points left)`,
      isCancelled: this.isCancelled,
    });
    if (this.isCancelled()) return;
    // Either the window has reset or the user asked to retry: let the next
    // response headers report the real remainder.
    this.restoreQuota();
  }

  private restoreQuota(): void {
    const state = this.readState();
    if (!state) return;
    const now = Math.floor(Date.now() / 1000);
    state.remaining = state.limit;
    if (now >= state.resetAt) state.resetAt = now + state.windowSeconds;
    state.updatedAt = now;
    this.writeState(state);
  }

  private readBlock(): { blockedUntil: number; strikes: number } | null {
    try {
      return JSON.parse(fs.readFileSync(this.blockFile, 'utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Sit out a 429 block, if one is in force. The block survives a restart.
   */
  async waitOutBlock(): Promise<void> {
    const block = this.readBlock();
    if (!block || block.blockedUntil === 0) return;

    if (block.blockedUntil > Math.floor(Date.now() / 1000)) {
      await sleepWithCountdown({
        resumeAt: (block.blockedUntil + 1) * 1000,
        reason: 'Your PDS server rate-limited this import',
        isCancelled: this.isCancelled,
      });
      if (this.isCancelled()) return; // keep the block for the next run
    }
    // Keep the strike count until a request succeeds, so backoff keeps growing.
    fs.writeFileSync(this.blockFile, JSON.stringify({ blockedUntil: 0, strikes: block.strikes }), 'utf8');
    this.restoreQuota();
  }

  /**
   * Called when the server returns a 429. Blocks until the time the server
   * names (`Retry-After` or `ratelimit-reset`). When it names none, backs off
   * from a minute and re-probes, never waiting past an already-known reset.
   *
   * @param errHeaders  Headers from the 429 error response.
   */
  handleRateLimitHit(errHeaders?: HeadersInput): void {
    const headers = normalizeHeaders(errHeaders);
    const learned = this.learnQuietly(headers);
    const hasReset = (headers['ratelimit-reset'] ?? headers['x-ratelimit-reset']) !== undefined;
    const now = Math.floor(Date.now() / 1000);
    const state = this.readState();

    const retryAfter = parseInt(headers['retry-after'] ?? '', 10);
    const retryAt = retryAfter > 0 ? now + retryAfter : 0;
    const resetAt = learned && hasReset && state && state.resetAt > now ? state.resetAt : 0;
    const strikes = this.readBlock()?.strikes ?? 0;

    let until = Math.max(retryAt, resetAt);
    if (!until) {
      until = now + rateLimitBackoffSeconds(strikes);
      if (state && state.resetAt > now) until = Math.min(until, state.resetAt);
    }

    this.ensureStateDir();
    fs.writeFileSync(this.blockFile, JSON.stringify({ blockedUntil: until, strikes: strikes + 1 }), 'utf8');
    if (state) {
      state.remaining = 0;
      state.updatedAt = now;
      this.writeState(state);
    }
    log.debug(`[RateLimiter] 429 received — blocked until ${new Date(until * 1000).toISOString()}`);
  }

  private learnQuietly(headers: Record<string, string>): boolean {
    return headers['ratelimit-limit'] || headers['x-ratelimit-limit'] ? this.learn(headers) : false;
  }

  /**
   * Return a reservation made by `waitForPermit`/`reserveQuota` that was
   * never actually spent — e.g. the batch it was reserved for failed for a
   * reason unrelated to rate limiting (validation error, network failure)
   * rather than being sent and accepted or rejected by the server. Without
   * this, failed batches permanently drain the persisted quota state even
   * though the server's real quota was untouched, eventually causing
   * `waitForPermit` to block on phantom rate limiting.
   *
   * @param points Number of points to return to `remaining`.
   */
  refund(points: number): void {
    const state = this.readState();
    if (!state) return;

    state.remaining = Math.min(state.limit, state.remaining + points);
    state.updatedAt = Math.floor(Date.now() / 1000);
    this.writeState(state);

    log.debug(`[RateLimiter] ↩️  Refunded ${points} points, ${state.remaining} remaining`);
  }

  /**
   * Wait for a permit with the given number of points, sitting out any 429
   * block or exhausted window first.
   *
   * @param pointsNeeded Number of points required
   * @returns true once reserved, false if the import was cancelled while waiting
   */
  async waitForPermit(pointsNeeded: number): Promise<boolean> {
    while (true) {
      await this.waitOutBlock();
      if (this.isCancelled()) return false;
      if (await this.reserveQuota(pointsNeeded)) return true;
      await this.waitForReset();
      if (this.isCancelled()) return false;
    }
  }
  
  /**
   * Get safe available points (remaining - headroom buffer).
   * This is the amount we can safely use without hitting the threshold.
   * 
   * ALGORITHM:
   * 1. Read state
   * 2. If no state: return 0 (forces probe batch)
   * 3. Check if window reset (auto-restore)
   * 4. Calculate: remaining - (limit × threshold)
   * 5. Return max(0, safe_points)
   * 
   * IMPORTANT: When quota is low (below headroom), this returns 0 to signal
   * that we should slow down, but the publisher should use sliding window
   * recovery (gradual pacing) rather than waiting for full reset.
   * 
   * EXAMPLE:
   * State: { limit: 5000, remaining: 4200 }
   * Headroom: 15% = 750 points
   * Safe: 4200 - 750 = 3450 points
   * 
   * USE CASE:
   * Call this to determine optimal batch size:
   * ```typescript
   * const safePoints = rl.getSafeAvailablePoints();
   * const batchSize = Math.floor(safePoints / 3); // 3 points per record
   * ```
   * 
   * @returns Safe available quota points (0 if no state or quota exhausted)
   */
  getSafeAvailablePoints(): number {
    const state = this.readState();
    if (!state) {
      // No state yet - return 0 to force conservative start
      // After first request, we'll learn the real limits
      return 0;
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // Auto-restore if window reset
    if (now >= state.resetAt) {
      log.debug(`[RateLimiter] Window reset detected, full quota: ${state.limit}`);
      return state.limit;
    }
    
    const headroomPoints = Math.floor(state.limit * this.headroomThreshold);
    const safePoints = Math.max(0, state.remaining - headroomPoints);
    
    log.debug(`[RateLimiter] Safe quota: ${safePoints} (${state.remaining} - ${headroomPoints} headroom)`);
    return safePoints;
  }
  
  /**
   * Get ACTUAL remaining points (without headroom buffer applied).
   * Used by the pacer to calculate recovery strategies.
   * 
   * @returns Actual remaining points from server
   */
  getActualRemaining(): number {
    const state = this.readState();
    if (!state) return 0;
    
    const now = Math.floor(Date.now() / 1000);
    if (now >= state.resetAt) {
      return state.limit;
    }
    
    return state.remaining;
  }
  
  /**
   * Get server capacity information (learned dynamically).
   * 
   * RETURNS:
   * - { limit, windowSeconds } if we've learned from server
   * - null if we haven't received headers yet
   * 
   * USE CASE:
   * Called by DynamicBatchCalculator to calculate initial batch size.
   * 
   * @returns Server capacity info or null
   */
  getServerCapacity(): { limit: number; windowSeconds: number } | null {
    const state = this.readState();
    if (!state || state.limit === 0) {
      return null;
    }
    return {
      limit: state.limit,
      windowSeconds: state.windowSeconds
    };
  }
  
  /**
   * Check if we've learned from the server yet.
   * 
   * @returns True if we have server capacity info
   */
  hasServerInfo(): boolean {
    return this.hasLearnedFromServer;
  }
  
  /**
   * Get current rate limit status for monitoring/debugging.
   * 
   * RETURNS:
   * Object with:
   * - hasState: Whether state exists
   * - limit: Server capacity (if known)
   * - remaining: Current quota (if known)
   * - remainingPercent: Quota as percentage (if known)
   * - headroomPoints: Absolute headroom in points (if known)
   * - effectiveRemaining: Safe quota after headroom (if known)
   * - resetAt: Reset timestamp (if known)
   * - secondsUntilReset: Time until reset (if known)
   * - windowSeconds: Window duration (if known)
   * 
   * @returns Current status object
   */
  getStatus(): {
    hasState: boolean;
    limit?: number;
    remaining?: number;
    remainingPercent?: number;
    headroomPoints?: number;
    effectiveRemaining?: number;
    resetAt?: Date;
    secondsUntilReset?: number;
    windowSeconds?: number;
  } {
    const state = this.readState();
    if (!state) {
      return { hasState: false };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const secondsUntilReset = Math.max(0, state.resetAt - now);
    const remainingPercent = (state.remaining / state.limit) * 100;
    const headroomPoints = Math.floor(state.limit * this.headroomThreshold);
    const effectiveRemaining = state.remaining - headroomPoints;
    
    return {
      hasState: true,
      limit: state.limit,
      remaining: state.remaining,
      remainingPercent,
      headroomPoints,
      effectiveRemaining,
      resetAt: new Date(state.resetAt * 1000),
      secondsUntilReset,
      windowSeconds: state.windowSeconds
    };
  }
}
