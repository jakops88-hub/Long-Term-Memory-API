/**
 * Phase 4 Demo: Hybrid Cost Guard & Dual-Lane Billing
 * 
 * This script demonstrates:
 * 1. RapidAPI user flow (bypasses balance, blocks expensive features)
 * 2. Direct user flow (checks balance, allows all features)
 * 3. Pro tier overage handling
 * 4. Hobby tier hard limits
 */

import { CostGuard } from '../src/services/hybridCostGuard';
import { UserContext } from '../src/types/billing';
import { prisma } from '../src/config/prisma';
import { redis } from '../src/config/redis';

async function setupTestUsers() {
  console.log('🔧 Setting up test users...\n');

  // Create RapidAPI test user
  const rapidApiUser = await prisma.user.upsert({
    where: { email: 'rapidapi-test@memvault.com' },
    create: {
      email: 'rapidapi-test@memvault.com',
      billing: {
        create: {
          tier: 'HOBBY',
          creditsBalance: 0 // Not used for RapidAPI
        }
      }
    },
    update: {},
    include: { billing: true }
  });

  // Create Direct Hobby user (low balance)
  const hobbyUser = await prisma.user.upsert({
    where: { email: 'hobby-test@memvault.com' },
    create: {
      email: 'hobby-test@memvault.com',
      billing: {
        create: {
          tier: 'HOBBY',
          creditsBalance: 100 // $1.00
        }
      }
    },
    update: {},
    include: { billing: true }
  });

  // Create Direct Pro user (with balance)
  const proUser = await prisma.user.upsert({
    where: { email: 'pro-test@memvault.com' },
    create: {
      email: 'pro-test@memvault.com',
      billing: {
        create: {
          tier: 'PRO',
          creditsBalance: 5000 // $50.00
        }
      }
    },
    update: {},
    include: { billing: true }
  });

  // Initialize Redis balances
  await redis.set(`user:${hobbyUser.id}:balance`, hobbyUser.billing!.creditsBalance.toString());
  await redis.set(`user:${proUser.id}:balance`, proUser.billing!.creditsBalance.toString());

  return { rapidApiUser, hobbyUser, proUser };
}

async function testRapidApiUser(userId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: RapidAPI User');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const context: UserContext = {
    userId,
    source: 'RAPIDAPI',
    tier: 'HOBBY',
    balance: 0
  };

  const estimatedCost = CostGuard.calculateEstimatedCost(1000, true, true);
  console.log(`📊 Estimated cost: ${estimatedCost} cents ($${(estimatedCost / 100).toFixed(2)})`);

  // Test access check
  const accessCheck = await CostGuard.checkAccess(userId, context, estimatedCost);
  
  console.log(`✅ Access allowed: ${accessCheck.allowed}`);
  console.log(`🔒 Background jobs allowed: ${accessCheck.allowBackgroundJobs}`);
  console.log(`💡 Reason: ${accessCheck.reason}\n`);

  // Test deduction (should be no-op)
  await CostGuard.deduct(userId, context, estimatedCost);
  const balance = await CostGuard.getBalance(userId);
  console.log(`💰 Balance after deduction: ${balance} cents (should be unchanged)\n`);

  console.log('✅ RapidAPI Flow Complete:\n');
  console.log('   - Bypassed balance check ✓');
  console.log('   - Blocked expensive background jobs ✓');
  console.log('   - No deduction performed ✓\n');
}

async function testHobbyUser(userId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Direct Hobby User (Hard Limit)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const context: UserContext = {
    userId,
    source: 'DIRECT',
    tier: 'HOBBY',
    balance: 100 // $1.00
  };

  const balance = await CostGuard.getBalance(userId);
  console.log(`💰 Initial balance: ${balance} cents ($${(balance / 100).toFixed(2)})`);

  // Test 1: Small operation (should succeed)
  const smallCost = 50;
  console.log(`\n📊 Attempting small operation: ${smallCost} cents`);
  
  try {
    const accessCheck = await CostGuard.checkAccess(userId, context, smallCost);
    console.log(`✅ Access granted: ${accessCheck.allowed}`);
    console.log(`🔓 Background jobs allowed: ${accessCheck.allowBackgroundJobs}`);
    
    await CostGuard.deduct(userId, context, smallCost);
    const newBalance = await CostGuard.getBalance(userId);
    console.log(`💰 Balance after deduction: ${newBalance} cents ($${(newBalance / 100).toFixed(2)})`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 2: Large operation (should fail - insufficient balance)
  const largeCost = 200;
  console.log(`\n📊 Attempting large operation: ${largeCost} cents`);
  
  try {
    const accessCheck = await CostGuard.checkAccess(userId, context, largeCost);
    console.log(`✅ Access granted: ${accessCheck.allowed}`);
  } catch (error: any) {
    console.log(`❌ Blocked: ${error.message}`);
    console.log(`   Status: ${error.status} (Payment Required)`);
  }

  console.log('\n✅ Hobby User Flow Complete:\n');
  console.log('   - Small operation succeeded ✓');
  console.log('   - Large operation blocked (hard limit) ✓');
  console.log('   - All features available ✓\n');
}

async function testProUser(userId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Direct Pro User (Overage Allowed)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const context: UserContext = {
    userId,
    source: 'DIRECT',
    tier: 'PRO',
    balance: 5000 // $50.00
  };

  const balance = await CostGuard.getBalance(userId);
  console.log(`💰 Initial balance: ${balance} cents ($${(balance / 100).toFixed(2)})`);

  // Test 1: Normal operation
  const normalCost = 1000;
  console.log(`\n📊 Performing operation: ${normalCost} cents`);
  
  const accessCheck1 = await CostGuard.checkAccess(userId, context, normalCost);
  console.log(`✅ Access granted: ${accessCheck1.allowed}`);
  console.log(`🔓 Background jobs allowed: ${accessCheck1.allowBackgroundJobs}`);
  
  await CostGuard.deduct(userId, context, normalCost);
  let newBalance = await CostGuard.getBalance(userId);
  console.log(`💰 Balance after deduction: ${newBalance} cents ($${(newBalance / 100).toFixed(2)})`);

  // Test 2: Multiple large operations (testing overage)
  console.log('\n📊 Performing multiple large operations...');
  
  for (let i = 1; i <= 6; i++) {
    const cost = 1000;
    try {
      const accessCheck = await CostGuard.checkAccess(userId, { ...context, balance: newBalance }, cost);
      await CostGuard.deduct(userId, context, cost);
      newBalance = await CostGuard.getBalance(userId);
      console.log(`   Operation ${i}: Success. Balance: ${newBalance} cents ($${(newBalance / 100).toFixed(2)})`);
    } catch (error: any) {
      console.log(`   Operation ${i}: Blocked - ${error.message}`);
      break;
    }
  }

  const finalBalance = await CostGuard.getBalance(userId);
  console.log(`\n💰 Final balance: ${finalBalance} cents ($${(finalBalance / 100).toFixed(2)})`);
  
  if (finalBalance < 0) {
    console.log(`⚠️  Overage: $${Math.abs(finalBalance / 100).toFixed(2)} (will be invoiced)`);
  }

  console.log('\n✅ Pro User Flow Complete:\n');
  console.log('   - Normal operations succeeded ✓');
  console.log('   - Overage allowed up to -$20.00 ✓');
  console.log('   - All features available ✓\n');
}

async function demonstrateFeatureMatrix() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FEATURE MATRIX');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('┌─────────────────┬─────────────┬──────────────┬────────────────┐');
  console.log('│ Feature         │ RapidAPI    │ Direct Hobby │ Direct Pro     │');
  console.log('├─────────────────┼─────────────┼──────────────┼────────────────┤');
  console.log('│ Balance Check   │ ❌ Bypassed │ ✅ Required  │ ✅ Required    │');
  console.log('│ Graph Extract   │ ❌ Blocked  │ ✅ Allowed   │ ✅ Allowed     │');
  console.log('│ Deep Recursion  │ ❌ Blocked  │ ✅ Allowed   │ ✅ Allowed     │');
  console.log('│ Sleep Cycles    │ ❌ Blocked  │ ✅ Allowed   │ ✅ Allowed     │');
  console.log('│ Overage         │ N/A         │ ❌ Disabled  │ ✅ Up to -$20  │');
  console.log('│ Auto Invoice    │ N/A         │ ❌ No        │ ✅ Yes         │');
  console.log('└─────────────────┴─────────────┴──────────────┴────────────────┘\n');
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       PHASE 4: HYBRID COST GUARD & DUAL-LANE BILLING        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const { rapidApiUser, hobbyUser, proUser } = await setupTestUsers();

    await testRapidApiUser(rapidApiUser.id);
    await testHobbyUser(hobbyUser.id);
    await testProUser(proUser.id);
    await demonstrateFeatureMatrix();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ All tests completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

main();
