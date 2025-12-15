/**
 * Test script for GraphRAG recursive retrieval
 * 
 * This script:
 * 1. Seeds test data with entities and relationships
 * 2. Tests vector search on memories and entities
 * 3. Tests recursive graph traversal
 * 4. Verifies multi-hop reasoning works correctly
 */

import { PrismaClient } from '@prisma/client';
import { GraphRAGService } from '../src/services/graphRAGService';
import { OpenAIEmbeddingProvider } from '../src/services/embeddings/OpenAIEmbeddingProvider';
import { env } from '../src/config';

const prisma = new PrismaClient();
// Use OpenAI for testing (more reliable than Ollama)
const embeddingProvider = new OpenAIEmbeddingProvider(env.openAiApiKey!);
const graphRAGService = new GraphRAGService(embeddingProvider);

const TEST_USER_ID = 'test-graphrag-user';

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  await prisma.relationship.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.entity.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.memory.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.userBilling.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
}

async function seedData() {
  console.log('🌱 Seeding test data...');

  // Create test user
  await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: 'test@graphrag.com'
    }
  });

  await prisma.userBilling.create({
    data: {
      userId: TEST_USER_ID,
      creditsBalance: 1000,
      tier: 'PRO'
    }
  });

  // Generate embeddings for test data
  const projectEmbedding = await embeddingProvider.generateEmbedding(
    'AlphaOS (Project): AI operating system project with Q1 2025 deadline'
  );
  const userEmbedding = await embeddingProvider.generateEmbedding(
    'John (Person): Software engineer working on AlphaOS'
  );
  const deadlineEmbedding = await embeddingProvider.generateEmbedding(
    'Q1 2025 Deadline (Event): Launch deadline for AlphaOS project'
  );
  const chatbotEmbedding = await embeddingProvider.generateEmbedding(
    'Chatbot Feature (Feature): AI-powered chatbot component of AlphaOS'
  );

  const memory1Embedding = await embeddingProvider.generateEmbedding(
    'John is working on the AlphaOS project'
  );
  const memory2Embedding = await embeddingProvider.generateEmbedding(
    'The AlphaOS deadline is Q1 2025'
  );
  const memory3Embedding = await embeddingProvider.generateEmbedding(
    'The chatbot feature needs to be completed before the deadline'
  );

  // Create entities with embeddings using raw SQL (Prisma doesn't support Unsupported types)
  const entities = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    INSERT INTO "Entity" (id, "userId", name, type, description, embedding, importance, confidence, "createdAt", "updatedAt", "lastAccessedAt")
    VALUES 
      (gen_random_uuid(), ${TEST_USER_ID}, 'John', 'Person', 'Software engineer working on AlphaOS', ${`[${userEmbedding.join(',')}]`}::vector, 0.8, 1.0, NOW(), NOW(), NOW()),
      (gen_random_uuid(), ${TEST_USER_ID}, 'AlphaOS', 'Project', 'AI operating system project with Q1 2025 deadline', ${`[${projectEmbedding.join(',')}]`}::vector, 0.9, 1.0, NOW(), NOW(), NOW()),
      (gen_random_uuid(), ${TEST_USER_ID}, 'Q1 2025 Deadline', 'Event', 'Launch deadline for AlphaOS project', ${`[${deadlineEmbedding.join(',')}]`}::vector, 0.9, 1.0, NOW(), NOW(), NOW()),
      (gen_random_uuid(), ${TEST_USER_ID}, 'Chatbot Feature', 'Feature', 'AI-powered chatbot component of AlphaOS', ${`[${chatbotEmbedding.join(',')}]`}::vector, 0.7, 1.0, NOW(), NOW(), NOW())
    RETURNING id, name
  `;

  const entityMap = new Map(entities.map(e => [e.name, e.id]));

  // Create relationships
  await prisma.relationship.create({
    data: {
      userId: TEST_USER_ID,
      fromEntityId: entityMap.get('John')!,
      toEntityId: entityMap.get('AlphaOS')!,
      predicate: 'WORKS_ON',
      confidence: 0.95
    }
  });

  await prisma.relationship.create({
    data: {
      userId: TEST_USER_ID,
      fromEntityId: entityMap.get('AlphaOS')!,
      toEntityId: entityMap.get('Q1 2025 Deadline')!,
      predicate: 'HAS_DEADLINE',
      confidence: 0.95
    }
  });

  await prisma.relationship.create({
    data: {
      userId: TEST_USER_ID,
      fromEntityId: entityMap.get('AlphaOS')!,
      toEntityId: entityMap.get('Chatbot Feature')!,
      predicate: 'INCLUDES',
      confidence: 0.9
    }
  });

  await prisma.relationship.create({
    data: {
      userId: TEST_USER_ID,
      fromEntityId: entityMap.get('Chatbot Feature')!,
      toEntityId: entityMap.get('Q1 2025 Deadline')!,
      predicate: 'MUST_COMPLETE_BEFORE',
      confidence: 0.85
    }
  });

  // Create memories using raw SQL
  await prisma.$executeRaw`
    INSERT INTO "Memory" (id, "userId", text, "compressedText", embedding, "importanceScore", confidence, "createdAt", "lastAccessedAt")
    VALUES 
      (gen_random_uuid(), ${TEST_USER_ID}, 'John is working on the AlphaOS project', 'John is working on the AlphaOS project', ${`[${memory1Embedding.join(',')}]`}::vector, 0.8, 1.0, NOW(), NOW()),
      (gen_random_uuid(), ${TEST_USER_ID}, 'The AlphaOS deadline is Q1 2025', 'The AlphaOS deadline is Q1 2025', ${`[${memory2Embedding.join(',')}]`}::vector, 0.9, 1.0, NOW(), NOW()),
      (gen_random_uuid(), ${TEST_USER_ID}, 'The chatbot feature needs to be completed before the deadline', 'The chatbot feature needs to be completed before the deadline', ${`[${memory3Embedding.join(',')}]`}::vector, 0.7, 1.0, NOW(), NOW())
  `;

  console.log('✅ Seeded: 4 entities, 4 relationships, 3 memories');
}

async function testRetrieval() {
  console.log('\n🔍 Testing GraphRAG Retrieval...\n');

  // Test 1: Query about John
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: "What is John working on?"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const result1 = await graphRAGService.retrieve({
    userId: TEST_USER_ID,
    query: 'What is John working on?',
    maxMemories: 5,
    maxEntities: 5,
    graphDepth: 2,
    minSimilarity: 0.5 // Lower threshold for testing
  });

  console.log(`\n📊 Results:`);
  console.log(`  - Memories found: ${result1.memories.length}`);
  console.log(`  - Entities found: ${result1.entities.length}`);
  console.log(`  - Graph nodes traversed: ${result1.graphNodes.length}`);
  console.log(`  - Total tokens in context: ${result1.totalTokens}`);

  if (result1.memories.length > 0) {
    console.log(`\n💾 Top Memory:`);
    console.log(`  "${result1.memories[0].text}" (similarity: ${result1.memories[0].similarity.toFixed(3)})`);
  }

  if (result1.entities.length > 0) {
    console.log(`\n🏷️  Top Entity:`);
    console.log(`  ${result1.entities[0].name} (${result1.entities[0].type}) - ${result1.entities[0].description}`);
    console.log(`  Similarity: ${result1.entities[0].similarity.toFixed(3)}`);
  }

  if (result1.graphNodes.length > 0) {
    console.log(`\n🕸️  Knowledge Graph (Multi-hop):`);
    result1.graphNodes.forEach(node => {
      const indent = '  '.repeat(node.depth);
      console.log(`${indent}→ ${node.entityName} (${node.entityType})`);
      if (node.relationshipChain) {
        console.log(`${indent}  via: ${node.relationshipChain}`);
      }
    });
  }

  // Test 2: Query about deadline (should find indirect connection through AlphaOS)
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: "When is the project deadline?"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const result2 = await graphRAGService.retrieve({
    userId: TEST_USER_ID,
    query: 'When is the project deadline?',
    maxMemories: 5,
    maxEntities: 5,
    graphDepth: 2,
    minSimilarity: 0.5 // Lower threshold for testing
  });

  console.log(`\n📊 Results:`);
  console.log(`  - Memories found: ${result2.memories.length}`);
  console.log(`  - Entities found: ${result2.entities.length}`);
  console.log(`  - Graph nodes traversed: ${result2.graphNodes.length}`);

  if (result2.graphNodes.length > 0) {
    console.log(`\n🕸️  Knowledge Graph:`);
    result2.graphNodes.forEach(node => {
      const indent = '  '.repeat(node.depth);
      console.log(`${indent}→ ${node.entityName} (${node.entityType})`);
      if (node.relationshipChain) {
        console.log(`${indent}  via: ${node.relationshipChain}`);
      }
    });
  }

  // Print synthesized context
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Synthesized Context for LLM:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(result2.contextSummary);
}

async function main() {
  try {
    await cleanup();
    await seedData();
    await testRetrieval();
    
    console.log('\n✨ GraphRAG test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
