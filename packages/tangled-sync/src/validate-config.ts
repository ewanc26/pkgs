import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log("🔍 Validating Tangled Sync Configuration...\n");

const checks: { name: string; status: boolean; message: string }[] = [];

// Check .env file exists
const envPath = path.join(__dirname, ".env");
const envExists = fs.existsSync(envPath);
checks.push({
  name: ".env file",
  status: envExists,
  message: envExists ? "Found at src/.env" : "Missing! Copy src/.env.example to src/.env"
});

// Check required environment variables
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
    name: `${name}`,
    status: exists,
    message: exists ? `✓ Set (${description})` : `✗ Missing (${description})`
  });
});

// Validate BASE_DIR
const baseDir = process.env.BASE_DIR;
if (baseDir) {
  const baseDirExists = fs.existsSync(baseDir);
  checks.push({
    name: "BASE_DIR exists",
    status: baseDirExists,
    message: baseDirExists ? `Directory exists: ${baseDir}` : `Directory missing: ${baseDir} (will be created)`
  });
}

// Validate DID format
const did = process.env.ATPROTO_DID;
if (did) {
  const validDid = did.startsWith("did:plc:") || did.startsWith("did:web:");
  checks.push({
    name: "DID format",
    status: validDid,
    message: validDid ? "Valid DID format" : "Invalid! Should start with 'did:plc:' or 'did:web:'"
  });
}

// Validate PDS URL
const pds = process.env.BLUESKY_PDS;
if (pds) {
  const validPds = pds.startsWith("http://") || pds.startsWith("https://");
  checks.push({
    name: "PDS URL format",
    status: validPds,
    message: validPds ? `Valid URL: ${pds}` : "Invalid! Should start with 'https://'"
  });
}

// Print results
console.log("Configuration Check Results:\n");
let allPassed = true;

checks.forEach((check) => {
  const icon = check.status ? "✅" : "❌";
  console.log(`${icon} ${check.name}: ${check.message}`);
  if (!check.status) allPassed = false;
});

console.log("\n" + "=".repeat(50) + "\n");

if (allPassed) {
  console.log("✅ All checks passed! You're ready to run:");
  console.log("   npm run test-atproto  # Test AT Proto connection");
  console.log("   npm run sync          # Run the full sync");
} else {
  console.log("❌ Some checks failed. Please fix the issues above.");
  console.log("   See SETUP.md for detailed instructions.");
  process.exit(1);
}

// Additional recommendations
console.log("\n💡 Recommendations:");

if (process.env.BLUESKY_PASSWORD && !process.env.BLUESKY_PASSWORD.includes("-")) {
  console.log("   ⚠️  Your password looks like it might be a regular password.");
  console.log("      Consider using an App Password from Bluesky settings.");
}

console.log("   📚 Read SETUP.md for detailed setup instructions");
console.log("   🔐 Never commit your .env file to version control");
console.log("   🔑 Make sure your SSH key is added to Tangled");
