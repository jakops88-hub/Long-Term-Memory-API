import { prisma } from '../src/config/prisma';
import { CostGuardService } from '../src/services/costGuardService';

async function seedTestUser() {
  const TEST_USER_ID = 'test-user-123';
  const TEST_USER_EMAIL = 'test@example.com';
  const INITIAL_CREDITS = 100000; // 100k credits

  console.log('Seeding test user...');

  try {
    // Create user in database
    const user = await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      create: {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        billing: {
          create: {
            creditsBalance: 0,
            tier: 'PRO'
          }
        }
      },
      update: {},
      include: {
        billing: true
      }
    });

    console.log(`✓ User created: ${user.email} (${user.id})`);

    // Set balance in Redis (Cost Guard)
    await CostGuardService.setBalance(TEST_USER_ID, INITIAL_CREDITS);
    console.log(`✓ Balance set: ${INITIAL_CREDITS} credits`);

    console.log('\n✅ Test user ready!');
    console.log(`   User ID: ${TEST_USER_ID}`);
    console.log(`   Email: ${TEST_USER_EMAIL}`);
    console.log(`   Balance: ${INITIAL_CREDITS} credits`);
    console.log(`   Tier: PRO`);

  } catch (error) {
    console.error('Error seeding test user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestUser();
