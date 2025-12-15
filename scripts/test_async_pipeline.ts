import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
const TEST_USER_ID = 'test-user-123';

async function testAsyncMemoryPipeline() {
  console.log('='.repeat(60));
  console.log('TESTING ASYNC MEMORY PIPELINE (Phase 2)');
  console.log('='.repeat(60));

  try {
    // Step 1: Set initial balance for the test user
    console.log('\n1. Setting up test user balance...');
    await axios.post(`${API_URL}/billing/set-balance`, {
      userId: TEST_USER_ID,
      amount: 10000 // 10,000 credits
    });
    console.log('✓ Balance set to 10,000 credits');

    // Step 2: Check balance
    console.log('\n2. Checking user balance...');
    const balanceRes = await axios.get(`${API_URL}/billing/balance/${TEST_USER_ID}`);
    console.log(`✓ Current balance: ${balanceRes.data.balance} credits`);

    // Step 3: Submit memory for async processing
    console.log('\n3. Submitting memory for async processing...');
    const memoryText = `John Doe bought an iPhone 15 Pro from the Apple Store in New York yesterday. 
    He is very excited about the new camera features and plans to use it for photography. 
    John works at TechCorp as a Senior Developer.`;

    const addRes = await axios.post(`${API_URL}/memory/add`, {
      userId: TEST_USER_ID,
      text: memoryText,
      metadata: {
        source: 'test',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✓ Memory queued successfully');
    console.log(`  Job ID: ${addRes.data.jobId}`);

    const jobId = addRes.data.jobId;

    // Step 4: Poll job status
    console.log('\n4. Polling job status...');
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!jobCompleted && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusRes = await axios.get(`${API_URL}/memory/job/${jobId}`);
      const { state, progress, result, error } = statusRes.data;

      console.log(`  Attempt ${attempts}: State=${state}, Progress=${progress}%`);

      if (state === 'completed') {
        jobCompleted = true;
        console.log('✓ Job completed successfully!');
        console.log(`  Memory ID: ${result.memoryId}`);
        console.log(`  Cost: ${result.cost} credits`);
      } else if (state === 'failed') {
        console.error('✗ Job failed:', error);
        break;
      }
    }

    if (!jobCompleted && attempts >= maxAttempts) {
      console.warn('⚠ Job did not complete within timeout');
    }

    // Step 5: Check final balance
    console.log('\n5. Checking final balance...');
    const finalBalanceRes = await axios.get(`${API_URL}/billing/balance/${TEST_USER_ID}`);
    console.log(`✓ Final balance: ${finalBalanceRes.data.balance} credits`);
    console.log(`  Credits used: ${balanceRes.data.balance - finalBalanceRes.data.balance}`);

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n✗ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testAsyncMemoryPipeline();
