/**
 * Example usage of MemVault SDK
 * 
 * Run with: node example.js
 */

const { MemVault } = require('./dist/index');

// IMPORTANT: Set your API key
const API_KEY = process.env.MEMVAULT_API_KEY || 'sk_test_memvault_production_key_2025_abc123def456ghi789jkl012mno345pqr';

async function main() {
  console.log('🚀 MemVault SDK Example\n');

  // Initialize client
  const memvault = new MemVault(API_KEY);

  try {
    // 1. Get user info
    console.log('1️⃣ Getting user info...');
    const user = await memvault.getUser();
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Tier: ${user.tier}`);
    console.log(`   Credits: ${user.creditsBalance}`);
    console.log();

    // 2. Add a memory
    console.log('2️⃣ Adding memory...');
    const addResult = await memvault.addMemory(
      "Team meeting on December 17, 2024: Decided to launch SDK first, then Slack bot. Priority on developer experience.",
      { category: "product-decision", date: "2024-12-17" }
    );
    console.log(`   Job ID: ${addResult.jobId}`);
    console.log(`   Message: ${addResult.message}\n`);

    // Wait a bit for processing
    console.log('   ⏳ Waiting for memory to process...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Retrieve memories
    console.log('3️⃣ Searching memories...');
    const searchResults = await memvault.retrieve("SDK launch decision", {
      limit: 5
    });
    console.log(`   Found ${searchResults.memories.length} memories`);
    console.log(`   Context: ${searchResults.context.substring(0, 100)}...`);
    if (searchResults.memories.length > 0) {
      console.log(`   Latest: "${searchResults.memories[0].content.substring(0, 80)}..."\n`);
    } else {
      console.log(`   (No memories found yet - they're still processing)\n`);
    }

    // 4. List API keys
    console.log('4️⃣ Listing API keys...');
    const keys = await memvault.listApiKeys();
    console.log(`   Total keys: ${keys.length}`);
    keys.forEach(key => {
      console.log(`   - ${key.name || 'Unnamed'} (${key.key.substring(0, 20)}...)`);
    });

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    if (error.statusCode) {
      console.error(`   Status: ${error.statusCode}`);
    }
    if (error.response) {
      console.error(`   Response:`, JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

main();
