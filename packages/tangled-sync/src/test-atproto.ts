import { AtpAgent } from "@atproto/api";
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
  
  const agent = new AtpAgent({ service });
  
  try {
    console.log("Attempting login...");
    const loginResponse = await agent.login({ 
      identifier: username, 
      password 
    });
    
    console.log("✓ Login successful!");
    console.log(`  DID: ${loginResponse.data.did}`);
    console.log(`  Handle: ${loginResponse.data.handle}`);
    console.log(`  Email: ${loginResponse.data.email || "N/A"}`);
    
    if (loginResponse.data.did !== atprotoDid) {
      console.warn(`\n⚠ WARNING: Logged in DID (${loginResponse.data.did}) does not match ATPROTO_DID in .env (${atprotoDid})`);
      console.warn("  Please update your ATPROTO_DID in src/.env");
    }
    
    // Test fetching existing records
    console.log("\nFetching existing sh.tangled.repo records...");
    const records = await agent.api.com.atproto.repo.listRecords({
      repo: loginResponse.data.did,
      collection: "sh.tangled.repo",
      limit: 10,
    });
    
    console.log(`✓ Found ${records.data.records.length} existing Tangled repo records`);
    
    if (records.data.records.length > 0) {
      console.log("\nSample records:");
      records.data.records.slice(0, 3).forEach((record: any) => {
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
