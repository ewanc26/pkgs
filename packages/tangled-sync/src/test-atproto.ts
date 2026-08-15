import { Client } from '@atproto/lex';
import { PasswordSession } from '@atproto/lex-password-session';
import { api, com } from '@bsky/sdk';
import dotenv from "dotenv";

dotenv.config();

async function testAtProtoConnection() {
  console.log("Testing AT Proto Connection...\n");

  const service = process.env.BLUESKY_PDS || "https://bsky.social";
  const username = process.env.BLUESKY_USERNAME;
  const password = process.env.BLUESKY_PASSWORD;
  const atprotoDid = process.env.ATPROTO_DID;

  console.log(`Service: ${service}`);
  console.log(`Username: ${username}`);
  console.log(`Expected DID: ${atprotoDid}\n`);

  if (!username || !password) {
    console.error("ERROR: Missing BLUESKY_USERNAME or BLUESKY_PASSWORD");
    process.exit(1);
  }

  try {
    console.log("Attempting login...");
    const session = await PasswordSession.login({
      service,
      identifier: username,
      password,
    });
    const client = new Client(session, { service: api.app.service });

    console.log("✓ Login successful!");
    console.log(`  DID: ${session.did}`);
    console.log(`  Handle: ${session.handle}`);
    console.log(`  Email: ${session.email || "N/A"}`);

    if (session.did !== atprotoDid) {
      console.warn(`\n⚠ WARNING: Logged in DID (${session.did}) does not match ATPROTO_DID in .env (${atprotoDid})`);
      console.warn("  Please update your ATPROTO_DID in src/.env");
    }

    console.log("\nFetching existing sh.tangled.repo records...");
    const records = await client.call(com.atproto.repo.listRecords, {
      repo: session.did,
      collection: "sh.tangled.repo",
      limit: 10,
    });

    console.log(`✓ Found ${records.records.length} existing Tangled repo records`);

    if (records.records.length > 0) {
      console.log("\nSample records:");
      records.records.slice(0, 3).forEach((record: any) => {
        console.log(`  - ${record.value.name} (${record.uri})`);
      });
    }

    console.log("\n✓ AT Proto connection test completed successfully!");

  } catch (error: any) {
    console.error("\n✗ AT Proto connection test failed!");
    console.error(`Error: ${error.message}`);
    if (error.status) {
      console.error(`HTTP Status: ${error.status}`);
    }
    process.exit(1);
  }
}

testAtProtoConnection();
