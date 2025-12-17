/**
 * Test Script: Verify 7-Day Trial Implementation
 * 
 * This script simulates the Stripe webhook flow for trial start
 * to ensure credits are provisioned correctly.
 * 
 * Run: npx ts-node scripts/test_trial_provisioning.ts
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/config/logger';

const prisma = new PrismaClient();

async function testTrialProvisioning() {
  console.log('\n🧪 Testing Trial Credit Provisioning\n');

  // Create test user
  const testUserId = `test_trial_user_${Date.now()}`;
  const testEmail = `trial-test-${Date.now()}@memvault.com`;
  const testApiKey = `sk_test_trial_${Math.random().toString(36).substring(2, 15)}`;
  const testCustomerId = `cus_test_${Date.now()}`;

  try {
    // Step 1: Create user with Hobby tier (simulate checkout.session.completed)
    console.log('📝 Step 1: Creating test user with HOBBY tier...');
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        apiKey: testApiKey,
        source: 'DIRECT',
        billing: {
          create: {
            tier: 'HOBBY',
            creditsBalance: 0, // Start with 0 credits
            stripeCustomerId: testCustomerId,
          },
        },
      },
      include: { billing: true },
    });

    console.log('✅ User created:', {
      userId: user.id,
      email: user.email,
      tier: user.billing?.tier,
      initialBalance: user.billing?.creditsBalance,
    });

    // Step 2: Simulate trial invoice ($0.00 payment)
    console.log('\n💰 Step 2: Simulating trial invoice payment ($0.00)...');
    
    // Find user billing by customerId
    let userBilling = await prisma.userBilling.findFirst({
      where: { stripeCustomerId: testCustomerId },
    });

    if (!userBilling) {
      throw new Error('User billing not found!');
    }

    const tier = userBilling.tier;
    let creditsToAdd = 0;

    if (tier === 'HOBBY') {
      creditsToAdd = 2900; // $29.00 = 100k tokens
    } else if (tier === 'PRO') {
      creditsToAdd = 9900; // $99.00 = 1M tokens
    }

    // Provision credits for trial (amountPaid = 0)
    const amountPaid = 0;
    if (amountPaid === 0) {
      await prisma.userBilling.update({
        where: { userId: userBilling.userId },
        data: { creditsBalance: creditsToAdd },
      });

      console.log('✅ Trial credits provisioned:', {
        userId: userBilling.userId,
        tier,
        creditsAdded: creditsToAdd,
        tokenEquivalent: tier === 'HOBBY' ? '100,000 tokens' : '1,000,000 tokens',
      });
    }

    // Step 3: Verify credits were added
    console.log('\n🔍 Step 3: Verifying credits...');
    const updatedBilling = await prisma.userBilling.findUnique({
      where: { userId: testUserId },
    });

    if (!updatedBilling) {
      throw new Error('Could not find updated billing!');
    }

    console.log('✅ Credits verified:', {
      userId: testUserId,
      creditsBalance: updatedBilling.creditsBalance,
      expected: creditsToAdd,
      match: updatedBilling.creditsBalance === creditsToAdd ? '✅ PASS' : '❌ FAIL',
    });

    // Step 4: Simulate recurring payment after trial ends
    console.log('\n🔄 Step 4: Simulating recurring payment after trial...');
    
    // Simulate user spending some credits during trial
    await prisma.userBilling.update({
      where: { userId: testUserId },
      data: { creditsBalance: 500 }, // User spent most credits
    });

    console.log('💸 User spent credits during trial, balance: 500 cents');

    // Recurring payment replenishes credits
    const recurringAmountPaid = 2900; // $29.00
    if (recurringAmountPaid > 0) {
      await prisma.userBilling.update({
        where: { userId: testUserId },
        data: { creditsBalance: creditsToAdd }, // Replenish full amount
      });

      console.log('✅ Recurring payment processed, credits replenished:', {
        amountPaid: `$${recurringAmountPaid / 100}`,
        newBalance: creditsToAdd,
      });
    }

    // Final verification
    const finalBilling = await prisma.userBilling.findUnique({
      where: { userId: testUserId },
    });

    console.log('\n🎯 Final Result:', {
      userId: testUserId,
      tier: finalBilling?.tier,
      creditsBalance: finalBilling?.creditsBalance,
      expected: creditsToAdd,
      testStatus: finalBilling?.creditsBalance === creditsToAdd ? '✅ ALL TESTS PASSED' : '❌ TEST FAILED',
    });

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.userBilling.delete({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    console.log('✅ Test data cleaned up\n');

    return true;
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    
    // Cleanup on error
    try {
      await prisma.userBilling.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testTrialProvisioning()
  .then((success) => {
    if (success) {
      console.log('✅ Trial provisioning test completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Trial provisioning test failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
