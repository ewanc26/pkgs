#!/usr/bin/env node

/**
 * Rate Limit Monitor - Check current rate limiting status
 * 
 * Usage:
 *   node scripts/rate-limit-monitor.js
 *   npm run monitor:rate-limit
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get state directory (matching packages/croft-click-core/src/paths.ts logic)
function getMalachiteStateDir() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const root = process.env.EWANC26_STATE_DIR || path.join(home, '.ewanc26');
  const target = path.join(root, 'malachite');

  // The CLI migrates legacy ~/.malachite (and the transitional ~/.pkgs/malachite)
  // into ~/.ewanc26/malachite on first run after the update; fall back to those
  // paths here so the monitor still works if it's run before that migration
  // has happened.
  const legacyCandidates = [path.join(home, '.malachite'), path.join(home, '.pkgs', 'malachite')];
  if (!fs.existsSync(target)) {
    const legacy = legacyCandidates.find((p) => fs.existsSync(p));
    if (legacy) return legacy;
  }

  return target;
}

const stateDir = path.join(getMalachiteStateDir(), 'state');
const rateLimitFile = path.join(stateDir, 'rate-limit.json');
const importStateFile = path.join(stateDir, 'import-state.json');

console.log('═══════════════════════════════════════════════');
console.log('  Malachite Rate Limit Monitor');
console.log('═══════════════════════════════════════════════\n');

// Check rate limit state
console.log('📊 Rate Limit Status');
console.log('─────────────────────────────────────────────');

if (!fs.existsSync(rateLimitFile)) {
  console.log('Status: No rate limit data available yet');
  console.log('        (Will be created after first API call)\n');
} else {
  try {
    const rateLimitData = JSON.parse(fs.readFileSync(rateLimitFile, 'utf8'));
    const { limit, remaining, windowSeconds, updatedAt } = rateLimitData;
    
    const now = Math.floor(Date.now() / 1000);
    const age = now - (updatedAt || 0);
    const ageMinutes = Math.floor(age / 60);
    const ageHours = Math.floor(ageMinutes / 60);
    
    console.log(`Limit:     ${limit?.toLocaleString() || 'Unknown'} points per window`);
    console.log(`Remaining: ${remaining?.toLocaleString() || 'Unknown'} points`);
    console.log(`Window:    ${windowSeconds || 'Unknown'}s (${Math.floor((windowSeconds || 0) / 60)}m)`);
    
    if (limit && remaining !== undefined) {
      const usedPercent = ((limit - remaining) / limit * 100).toFixed(1);
      const remainingPercent = (remaining / limit * 100).toFixed(1);
      console.log(`Used:      ${usedPercent}% of quota`);
      console.log(`Available: ${remainingPercent}% remaining`);
      
      // Visual bar
      const barLength = 40;
      const usedBars = Math.floor((limit - remaining) / limit * barLength);
      const remainingBars = barLength - usedBars;
      const bar = '█'.repeat(usedBars) + '░'.repeat(remainingBars);
      console.log(`Progress:  [${bar}]`);
      
      // Warning if low
      if (remaining < limit * 0.1) {
        console.log('\n⚠️  WARNING: Low quota remaining!');
        console.log('   Consider waiting for quota reset before continuing.');
      } else if (remaining < limit * 0.25) {
        console.log('\n⚡ NOTICE: Quota below 25%');
        console.log('   Import will slow down or pause if needed.');
      }
    }
    
    console.log(`\nLast Updated: ${ageHours > 0 ? `${ageHours}h` : `${ageMinutes}m`} ago`);
    
    if (windowSeconds && remaining !== undefined && remaining < 100) {
      const resetTime = updatedAt + windowSeconds;
      const resetIn = resetTime - now;
      if (resetIn > 0) {
        const resetMinutes = Math.floor(resetIn / 60);
        const resetHours = Math.floor(resetMinutes / 60);
        console.log(`Resets in:    ${resetHours > 0 ? `${resetHours}h ${resetMinutes % 60}m` : `${resetMinutes}m`}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error reading rate limit file: ${error.message}`);
  }
}

console.log('');

// Check import state
console.log('📦 Import Status');
console.log('─────────────────────────────────────────────');

if (!fs.existsSync(importStateFile)) {
  console.log('Status: No import in progress\n');
} else {
  try {
    const importData = JSON.parse(fs.readFileSync(importStateFile, 'utf8'));
    const { totalRecords, processedRecords, successCount, errorCount, completed, startedAt, completedAt } = importData;
    
    if (completed) {
      console.log('Status: ✅ Import completed');
      console.log(`Total:  ${totalRecords?.toLocaleString() || 'Unknown'} records`);
      console.log(`Success: ${successCount?.toLocaleString() || 'Unknown'} records`);
      if (errorCount > 0) {
        console.log(`Errors:  ${errorCount.toLocaleString()} records`);
      }
      
      if (startedAt && completedAt) {
        const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Duration: ${hours}h ${minutes}m`);
      }
      
      console.log(`\nCompleted: ${new Date(completedAt).toLocaleString()}`);
    } else {
      console.log('Status: 🔄 Import in progress');
      console.log(`Total:     ${totalRecords?.toLocaleString() || 'Unknown'} records`);
      console.log(`Processed: ${processedRecords?.toLocaleString() || 'Unknown'} records`);
      console.log(`Success:   ${successCount?.toLocaleString() || 'Unknown'} records`);
      if (errorCount > 0) {
        console.log(`Errors:    ${errorCount.toLocaleString()} records`);
      }
      
      if (totalRecords && processedRecords !== undefined) {
        const progress = (processedRecords / totalRecords * 100).toFixed(1);
        console.log(`Progress:  ${progress}%`);
        
        // Visual bar
        const barLength = 40;
        const progressBars = Math.floor(processedRecords / totalRecords * barLength);
        const remainingBars = barLength - progressBars;
        const bar = '█'.repeat(progressBars) + '░'.repeat(remainingBars);
        console.log(`           [${bar}]`);
        
        const remaining = totalRecords - processedRecords;
        console.log(`Remaining: ${remaining.toLocaleString()} records`);
      }
      
      if (startedAt) {
        const elapsed = Date.now() - new Date(startedAt).getTime();
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`\nElapsed: ${hours}h ${minutes}m`);
        console.log(`Started: ${new Date(startedAt).toLocaleString()}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error reading import state: ${error.message}`);
  }
}

console.log('');

// Configuration info
console.log('⚙️  Configuration');
console.log('─────────────────────────────────────────────');
console.log(`State Directory: ${stateDir}`);
console.log(`Rate Limit File: ${fs.existsSync(rateLimitFile) ? '✅ Present' : '⚠️  Not found'}`);
console.log(`Import State:    ${fs.existsSync(importStateFile) ? '✅ Present' : '⚠️  Not found'}`);

console.log('\n═══════════════════════════════════════════════\n');

// Recommendations
if (fs.existsSync(rateLimitFile)) {
  try {
    const rateLimitData = JSON.parse(fs.readFileSync(rateLimitFile, 'utf8'));
    const { limit, remaining } = rateLimitData;
    
    if (limit && remaining !== undefined) {
      console.log('💡 Recommendations:');
      console.log('─────────────────────────────────────────────');
      
      if (remaining < limit * 0.1) {
        console.log('• WAIT for quota reset before importing more');
        console.log('• Current quota very low (<10%)');
      } else if (remaining < limit * 0.25) {
        console.log('• Consider using default safety margin (75%)');
        console.log('• Avoid --aggressive mode for now');
      } else if (remaining > limit * 0.75) {
        console.log('• ✅ Good quota available');
        console.log('• Safe to import with default or aggressive settings');
      } else {
        console.log('• ✅ Adequate quota available');
        console.log('• Safe to import with default settings');
      }
      
      console.log('• Always run with --dry-run first to preview');
      console.log('• System will auto-pause if quota is low');
      console.log('');
    }
  } catch (error) {
    // Silent - already reported above
  }
}

// Exit successfully
process.exit(0);
