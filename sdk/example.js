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
    console.log(`   Credits: ${user.billing.creditsBalance}\n`);

    // 2. Add a memory
    console.log('2️⃣ Adding memory...');
    const addResult = await memvault.addMemory(
      "Team meeting on December 17, 2024: Decided to launch SDK first, then Slack bot. Priority on developer experience.",
      { category: "product-decision", date: "2024-12-17" }
    );
    console.log(`   Job ID: ${addResult.jobId}`);
    console.log(`   Status: ${addResult.status}\n`);

    // Wait a bit for processing
    console.log('   ⏳ Waiting for memory to process...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Retrieve memories
    console.log('3️⃣ Searching memories...');
    const searchResults = await memvault.retrieve("SDK launch decision", {
      limit: 5
    });
    console.log(`   Found ${searchResults.results.length} memories`);
    if (searchResults.results.length > 0) {
      console.log(`   Latest: "${searchResults.results[0].content.substring(0, 80)}..."\n`);
    }

    // 4. Ask a question
    console.log('4️⃣ Asking a question...');
    const answer = await memvault.ask("What did we decide to build first?");
    console.log(`   Answer: ${answer.answer}`);
    console.log(`   Confidence: ${answer.confidence}`);
    console.log(`   Sources: ${answer.sources.length} memories\n`);

    // 5. List API keys
    console.log('5️⃣ Listing API keys...');
    const keys = await memvault.listApiKeys();
    console.log(`   Total keys: ${keys.length}`);
    keys.forEach(key => {
      console.log(`   - ${key.name || 'Unnamed'} (${key.key.substring(0, 20)}...)`);
    });

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.statusCode) {
      console.error(`   Status: ${error.statusCode}`);
    }
    process.exit(1);
  }
}

main();
