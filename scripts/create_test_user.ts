import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Generate API key
    const apiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`;
    
    // Generate unique userId
    const userId = `user_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const email = 'test@memvault.com';

    // Create user with PRO tier
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: email,
        apiKey: apiKey,
        source: 'DIRECT',
        billing: {
          create: {
            tier: 'PRO',
            creditsBalance: 0,
          },
        },
      },
      include: {
        billing: true,
      },
    });

    console.log('\n✅ Test user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', user.email);
    console.log('🔑 API Key:', apiKey);
    console.log('👤 User ID:', user.id);
    console.log('💎 Tier:', user.billing?.tier);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Use this API key to test frontend authentication!\n');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
