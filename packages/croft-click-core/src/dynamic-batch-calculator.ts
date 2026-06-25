/**
 * @fileoverview Dynamic Batch Calculator - Zero Hardcoded Defaults
 *
 * Environment-agnostic version (no Node.js dependencies).
 *
 * This module provides intelligent, real-time calculation of optimal batch sizes and delays
 * for publishing records to AT Protocol. Unlike traditional static batching systems that use
 * hardcoded defaults, this calculator learns and adapts continuously based on:
 *
 * 1. **Server Rate Limit Capacity**: Learned from response headers (e.g., 5000 points/hour)
 * 2. **Current Quota Availability**: Real-time tracking of remaining points
 * 3. **Network Performance Metrics**: Rolling window of recent batch durations
 * 4. **Success/Failure Patterns**: Consecutive outcomes to detect trends
 *
 * DESIGN PHILOSOPHY:
 * - NO HARDCODED DEFAULTS: All calculations derived from runtime data
 * - CONTINUOUS ADAPTATION: Adjusts every batch based on current conditions
 * - CONFIDENCE SCORING: Indicates reliability of calculations
 * - GRACEFUL DEGRADATION: Scales down smoothly when quota depletes
 * - INSTANT RECOVERY: Returns to optimal speed after quota resets
 */

/**
 * Network performance metrics tracked over a rolling window.
 * Used to detect trends in batch processing speed and adjust accordingly.
 */
export interface NetworkMetrics {
  /** Recent batch durations in milliseconds (rolling window of 10) */
  recentBatchDurations: number[];

  /** Recent batch sizes (rolling window of 10) */
  recentBatchSizes: number[];

  /** Count of consecutive successful batches (resets on failure) */
  consecutiveSuccesses: number;

  /** Count of consecutive failed batches (resets on success) */
  consecutiveFailures: number;

  /** Unix timestamp (ms) when metrics were last updated */
  lastUpdated: number;
}

/**
 * Result of a batch size/delay calculation.
 * Provides the recommended values along with reasoning and confidence.
 */
export interface BatchCalculation {
  /** Recommended batch size (1-200 records per batch) */
  batchSize: number;

  /** Recommended delay between batches (100-2000ms) */
  batchDelay: number;

  /** Human-readable explanation of why these values were chosen */
  reason: string;

  /** Confidence level (0.0-1.0) indicating reliability of calculation */
  confidence: number;
}

/**
 * DynamicBatchCalculator - Intelligent batch size and delay calculator
 *
 * CORE ALGORITHM:
 *
 * 1. QUOTA-BASED SIZING:
 *    batch_size = min(available_points / 3, 200)
 *
 * 2. METRIC-BASED DELAYS:
 *    If performing well (3+ successes):
 *      delay = avg_duration * 0.1 (fast)
 *    Otherwise:
 *      delay = avg_duration * 0.5 (conservative)
 *    Minimum: 100ms
 *
 * 3. ADAPTIVE SCALING:
 *    - 5+ consecutive successes -> *1.25 scale up
 *    - 2+ consecutive failures -> *0.67 scale down
 *    - Network 50%+ slower -> *0.8 scale down
 *    - Network 30%+ faster -> *1.15 scale up
 */
export class DynamicBatchCalculator {
  /** Cost per record in AT Protocol rate limiting (constant) */
  private readonly POINTS_PER_RECORD = 3;

  /** PDS hard limit for applyWrites operations (AT Protocol spec) */
  private readonly MAX_PDS_BATCH_SIZE = 200;

  /** Number of recent batches to track for trend analysis */
  private readonly METRICS_WINDOW_SIZE = 10;

  /** Absolute minimum delay to prevent hammering the server */
  private readonly MIN_DELAY_MS = 100;

  /** Current network performance metrics (rolling window) */
  private metrics: NetworkMetrics = {
    recentBatchDurations: [],
    recentBatchSizes: [],
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    lastUpdated: Date.now()
  };

  /**
   * Calculate optimal batch size based purely on available rate limit points.
   *
   * @param availablePoints Current safe quota available (after headroom)
   * @param serverLimit Total server capacity (null if unknown)
   * @returns Batch calculation or null if no data
   */
  calculateBatchSizeFromQuota(availablePoints: number, serverLimit: number | null): BatchCalculation | null {
    if (availablePoints <= 0) {
      return {
        batchSize: 0,
        batchDelay: 0,
        reason: 'No quota available - must wait for reset',
        confidence: 1.0
      };
    }

    // Calculate max records from available points
    const maxRecordsFromQuota = Math.floor(availablePoints / this.POINTS_PER_RECORD);

    // Clamp to PDS hard limit
    const batchSize = Math.min(maxRecordsFromQuota, this.MAX_PDS_BATCH_SIZE);

    // Calculate confidence based on how much information we have
    let confidence = 0.5; // Base confidence
    if (serverLimit !== null && serverLimit > 0) {
      // We have server limit info - higher confidence
      const quotaPercentage = availablePoints / serverLimit;
      confidence = Math.min(0.95, 0.6 + quotaPercentage * 0.3);
    }

    if (batchSize === 0) {
      return {
        batchSize: 0,
        batchDelay: 0,
        reason: 'Available points too low for even one record',
        confidence
      };
    }

    const reason = serverLimit
      ? `Quota-based: ${availablePoints}/${serverLimit} points (${(availablePoints / serverLimit * 100).toFixed(1)}%)`
      : `Quota-based: ${availablePoints} points available`;

    return {
      batchSize,
      batchDelay: this.calculateDelayFromMetrics(),
      reason,
      confidence
    };
  }

  /**
   * Calculate initial batch size from server rate limit headers.
   * Used when we first learn the server's capacity from the first response.
   *
   * @param serverLimit Server rate limit capacity (e.g., 5000)
   * @param windowSeconds Rate limit window duration (e.g., 3600 = 1 hour)
   * @returns Initial batch calculation with 0.7 confidence
   */
  calculateInitialBatchFromServer(serverLimit: number, windowSeconds: number): BatchCalculation {
    // Calculate maximum sustainable throughput
    const pointsPerSecond = serverLimit / windowSeconds;
    const recordsPerSecond = pointsPerSecond / this.POINTS_PER_RECORD;

    // Start conservatively: aim to use quota over 2x the window time
    const conservativeRecordsPerSecond = recordsPerSecond / 2;

    // Calculate batch size that maintains this rate with reasonable batching
    // Assume we want ~1 batch per 2 seconds initially
    const targetBatchInterval = 2; // seconds
    const initialBatchSize = Math.floor(conservativeRecordsPerSecond * targetBatchInterval);

    // Clamp to reasonable bounds
    const clampedBatchSize = Math.max(
      1, // At least 1 record
      Math.min(initialBatchSize, this.MAX_PDS_BATCH_SIZE)
    );

    return {
      batchSize: clampedBatchSize,
      batchDelay: this.calculateDelayFromMetrics(),
      reason: `Server capacity: ${serverLimit} points/${windowSeconds}s (conservative start)`,
      confidence: 0.7
    };
  }

  /**
   * Calculate delay based on recent network performance metrics.
   *
   * ALGORITHM:
   * - If no history: return MIN_DELAY_MS (100ms)
   * - Calculate average batch duration from recent batches
   * - If performing well (3+ successes): delay = avg * 0.1 (fast)
   * - Otherwise: delay = avg * 0.5 (conservative)
   * - Never go below MIN_DELAY_MS
   *
   * @returns Recommended delay in milliseconds (100-2000ms typically)
   */
  private calculateDelayFromMetrics(): number {
    if (this.metrics.recentBatchDurations.length === 0) {
      // No history - use minimum safe delay
      return this.MIN_DELAY_MS;
    }

    // Calculate average batch duration
    const avgDuration = this.metrics.recentBatchDurations.reduce((a, b) => a + b, 0)
      / this.metrics.recentBatchDurations.length;

    // Base delay on average processing time
    // Good performance: delay = 10% of processing time
    // Poor performance: delay = 50% of processing time
    const performanceMultiplier = this.metrics.consecutiveSuccesses > 3 ? 0.1 : 0.5;
    const calculatedDelay = Math.floor(avgDuration * performanceMultiplier);

    // Never go below minimum
    return Math.max(this.MIN_DELAY_MS, calculatedDelay);
  }

  /**
   * Record a successful batch for metrics tracking.
   *
   * @param batchSize Number of records in the successful batch
   * @param durationMs Time taken to process the batch (milliseconds)
   */
  recordSuccess(batchSize: number, durationMs: number): void {
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.addBatchMetric(batchSize, durationMs);
  }

  /**
   * Record a failed batch for metrics tracking.
   *
   * @param batchSize Number of records in the failed batch
   * @param durationMs Time taken before the batch failed (milliseconds)
   */
  recordFailure(batchSize: number, durationMs: number): void {
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.addBatchMetric(batchSize, durationMs);
  }

  /**
   * Add a batch metric to the rolling window.
   * Maintains a maximum window size of METRICS_WINDOW_SIZE (10) by
   * removing the oldest metric when the window is full.
   *
   * @param batchSize Number of records in the batch
   * @param durationMs Time taken to process the batch
   */
  private addBatchMetric(batchSize: number, durationMs: number): void {
    this.metrics.recentBatchDurations.push(durationMs);
    this.metrics.recentBatchSizes.push(batchSize);
    this.metrics.lastUpdated = Date.now();

    // Keep only recent metrics
    if (this.metrics.recentBatchDurations.length > this.METRICS_WINDOW_SIZE) {
      this.metrics.recentBatchDurations.shift();
      this.metrics.recentBatchSizes.shift();
    }
  }

  /**
   * Calculate adaptive scaling factor based on performance patterns.
   *
   * RULES:
   * 1. Scale up *1.25 after 5 consecutive successes
   * 2. Scale down *0.67 after 2 consecutive failures
   * 3. Scale down *0.8 if recent batches are 50%+ slower
   * 4. Scale up *1.15 if recent batches are 30%+ faster
   * 5. Return 1.0 (no change) for stable performance
   *
   * @returns Scale factor (0.67-1.25) and human-readable reason
   */
  calculateAdaptiveScale(): { scale: number; reason: string } {
    // No adjustment needed if no history
    if (this.metrics.recentBatchDurations.length < 3) {
      return { scale: 1.0, reason: 'Insufficient history for adaptation' };
    }

    // Scale up on consistent success
    if (this.metrics.consecutiveSuccesses >= 5) {
      return {
        scale: 1.25,
        reason: `Performance excellent (${this.metrics.consecutiveSuccesses} successes)`
      };
    }

    // Scale down on failures
    if (this.metrics.consecutiveFailures >= 2) {
      return {
        scale: 0.67,
        reason: `Performance degraded (${this.metrics.consecutiveFailures} failures)`
      };
    }

    // Check if recent batches are getting slower
    if (this.metrics.recentBatchDurations.length >= 5) {
      const recentAvg = this.metrics.recentBatchDurations.slice(-3).reduce((a, b) => a + b) / 3;
      const olderAvg = this.metrics.recentBatchDurations.slice(0, 3).reduce((a, b) => a + b) / 3;

      if (recentAvg > olderAvg * 1.5) {
        return {
          scale: 0.8,
          reason: 'Network performance degrading'
        };
      }

      if (recentAvg < olderAvg * 0.7) {
        return {
          scale: 1.15,
          reason: 'Network performance improving'
        };
      }
    }

    return { scale: 1.0, reason: 'Performance stable' };
  }

  /**
   * Get current metrics for logging/debugging.
   * Returns a copy of the metrics to prevent external modification.
   *
   * @returns Current network performance metrics
   */
  getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary for display.
   *
   * @returns Human-readable performance summary string
   */
  getPerformanceSummary(): string {
    if (this.metrics.recentBatchDurations.length === 0) {
      return 'No performance data yet';
    }

    const avgDuration = this.metrics.recentBatchDurations.reduce((a, b) => a + b, 0)
      / this.metrics.recentBatchDurations.length;
    const avgSize = this.metrics.recentBatchSizes.reduce((a, b) => a + b, 0)
      / this.metrics.recentBatchSizes.length;
    const recordsPerSecond = (avgSize / avgDuration) * 1000;

    return `Avg: ${avgSize.toFixed(0)} records in ${avgDuration.toFixed(0)}ms (~${recordsPerSecond.toFixed(1)} rec/s)`;
  }
}
