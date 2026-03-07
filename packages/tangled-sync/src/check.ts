import { AtpAgent } from "@atproto/api";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runHealthCheck() {

console.log("🔍 Running Tangled Sync Health Check...\n");

const checks: { category: string; name: string; status: boolean; message: string }[] = [];
let errors = 0;
let warnings = 0;

// ===== CONFIGURATION CHECKS =====
console.log("📋 Configuration Checks\n");

const envPath = path.join(__dirname, ".env");
const envExists = fs.existsSync(envPath);
checks.push({
  category: "config",
  name: ".env file",
  status: envExists,
  message: envExists ? "Found at src/.env" : "Missing! Copy src/.env.example to src/.env"
});
if (!envExists) errors++;

const requiredVars = [
  { name: "BASE_DIR", description: "Base directory for repos" },
  { name: "GITHUB_USER", description: "GitHub username" },
  { name: "ATPROTO_DID", description: "AT Proto DID" },
  { name: "BLUESKY_PDS", description: "Bluesky PDS URL" },
  { name: "BLUESKY_USERNAME", description: "Bluesky username" },
  { name: "BLUESKY_PASSWORD", description: "Bluesky app password" },
];

requiredVars.forEach(({ name, description }) => {
  const value = process.env[name];
  const exists = !!value && value.trim().length > 0;
  checks.push({
    category: "config",
    name: name,
    status: exists,
    message: exists ? `Set` : `Missing (${description})`
  });
  if (!exists) errors++;
});

// Check BASE_DIR
const baseDir = process.env.BASE_DIR;
if (baseDir) {
  const baseDirExists = fs.existsSync(baseDir);
  checks.push({
    category: "config",
    name: "BASE_DIR path",
    status: baseDirExists,
    message: baseDirExists ? `Exists: ${baseDir}` : `Missing (will be created): ${baseDir}`
  });
  if (!baseDirExists) warnings++;
}

// Check DID format
const did = process.env.ATPROTO_DID;
if (did) {
  const validDid = did.startsWith("did:plc:") || did.startsWith("did:web:");
  checks.push({
    category: "config",
    name: "DID format",
    status: validDid,
    message: validDid ? "Valid" : "Invalid! Should start with 'did:plc:' or 'did:web:'"
  });
  if (!validDid) errors++;
}

// Check PDS URL
const pds = process.env.BLUESKY_PDS;
if (pds) {
  const validPds = pds.startsWith("http://") || pds.startsWith("https://");
  checks.push({
    category: "config",
    name: "PDS URL",
    status: validPds,
    message: validPds ? pds : "Invalid! Should start with 'https://'"
  });
  if (!validPds) errors++;
}

// Print config results
checks.filter(c => c.category === "config").forEach((check) => {
  const icon = check.status ? "✅" : "❌";
  console.log(`${icon} ${check.name}: ${check.message}`);
});

// ===== AT PROTO CONNECTION CHECK =====
console.log("\n🔐 AT Proto Connection Check\n");

const canTestConnection = process.env.BLUESKY_USERNAME && 
                         process.env.BLUESKY_PASSWORD && 
                         process.env.BLUESKY_PDS &&
                         process.env.ATPROTO_DID;

if (canTestConnection) {
  try {
    const agent = new AtpAgent({ service: process.env.BLUESKY_PDS! });
    
    const loginResponse = await agent.login({
      identifier: process.env.BLUESKY_USERNAME!,
      password: process.env.BLUESKY_PASSWORD!
    });
    
    console.log(`✅ Login successful`);
    console.log(`   DID: ${loginResponse.data.did}`);
    console.log(`   Handle: ${loginResponse.data.handle}`);
    
    if (loginResponse.data.did !== process.env.ATPROTO_DID) {
      console.log(`⚠️  DID mismatch!`);
      console.log(`   Expected: ${process.env.ATPROTO_DID}`);
      console.log(`   Got: ${loginResponse.data.did}`);
      warnings++;
    }
    
    // Test fetching records
    const records = await agent.api.com.atproto.repo.listRecords({
      repo: loginResponse.data.did,
      collection: "sh.tangled.repo",
      limit: 5,
    });
    
    console.log(`✅ Can access AT Proto records`);
    console.log(`   Found ${records.data.records.length} sample records`);
    
  } catch (error: any) {
    console.log(`❌ AT Proto connection failed`);
    console.log(`   Error: ${error.message}`);
    errors++;
  }
} else {
  console.log("⏭️  Skipped (missing credentials)");
}

// ===== SSH CONNECTION CHECK =====
console.log("\n🔑 SSH Connection Check\n");

try {
  const sshTest = execSync("ssh -T git@tangled.sh 2>&1", { 
    encoding: "utf-8",
    timeout: 5000 
  });
  
  if (sshTest.includes("successfully authenticated") || sshTest.includes("Hi")) {
    console.log("✅ SSH connection to Tangled works");
    console.log(`   ${sshTest.trim().split('\n')[0]}`);
  } else {
    console.log("⚠️  SSH connection uncertain");
    console.log(`   Response: ${sshTest.trim()}`);
    warnings++;
  }
} catch (error: any) {
  const output = error.stdout?.toString() || error.message;
  
  if (output.includes("successfully authenticated") || output.includes("Hi")) {
    console.log("✅ SSH connection to Tangled works");
  } else {
    console.log("❌ SSH connection to Tangled failed");
    console.log("   Make sure your SSH key is added at https://tangled.org/settings/keys");
    errors++;
  }
}

// ===== GITHUB API CHECK =====
console.log("\n🐙 GitHub API Check\n");

if (process.env.GITHUB_USER) {
  try {
    const response = execSync(`curl -s "https://api.github.com/users/${process.env.GITHUB_USER}"`, {
      encoding: "utf-8",
      timeout: 5000
    });
    
    const data = JSON.parse(response);
    
    if (data.login) {
      console.log(`✅ GitHub user found: ${data.login}`);
      console.log(`   Public repos: ${data.public_repos || 0}`);
    } else {
      console.log(`❌ GitHub user not found: ${process.env.GITHUB_USER}`);
      errors++;
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check GitHub API`);
    console.log(`   ${error.message}`);
    warnings++;
  }
} else {
  console.log("⏭️  Skipped (no GITHUB_USER set)");
}

// ===== DEPENDENCIES CHECK =====
console.log("\n📦 Dependencies Check\n");

let hasAtproto = false;
let hasDotenv = false;

try {
  await import("@atproto/api");
  hasAtproto = true;
  console.log("✅ @atproto/api installed");
} catch {
  console.log("❌ @atproto/api not installed (run: npm install)");
  errors++;
}

try {
  await import("dotenv");
  hasDotenv = true;
  console.log("✅ dotenv installed");
} catch {
  console.log("❌ dotenv not installed (run: npm install)");
  errors++;
}

// ===== SUMMARY =====
console.log("\n" + "=".repeat(50));

if (errors === 0 && warnings === 0) {
  console.log("✅ All checks passed! Ready to sync.");
  console.log("\nNext steps:");
  console.log("  npm run sync       # Sync new repos only");
  console.log("  npm run sync:force # Force sync all repos");
} else {
  if (errors > 0) {
    console.log(`❌ ${errors} error(s) found - please fix before syncing`);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} warning(s) - review before syncing`);
  }
  
  console.log("\nSee SETUP.md for detailed troubleshooting");
  
  if (errors > 0) {
    process.exit(1);
  }
}

console.log("=".repeat(50));

// Additional recommendations
if (process.env.BLUESKY_PASSWORD && !process.env.BLUESKY_PASSWORD.includes("-")) {
  console.log("\n💡 Tip: Your password might be a regular password.");
  console.log("   Consider using an App Password from Bluesky settings for better security.");
}

}

// Run the health check
runHealthCheck().catch((error) => {
  console.error("\n❌ Health check failed with error:");
  console.error(error);
  process.exit(1);
});
