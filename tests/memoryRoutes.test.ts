import request from 'supertest';
import { createApp } from '../src/app';
import { MemoryService } from '../src/services/memoryService';
import { FakeEmbeddingProvider, FakeMemoryRepository, FakeSessionRepository } from './fakes';

process.env.ENABLE_EMBEDDINGS = 'true';
process.env.OPENAI_API_KEY = 'test-key';

describe('Memory routes', () => {
  const sessionId = 'route-session';
  const memoryRepository = new FakeMemoryRepository();
  const sessionRepository = new FakeSessionRepository();
  const embeddingProvider = new FakeEmbeddingProvider(0.6, false);
  const memoryService = new MemoryService(memoryRepository, sessionRepository, embeddingProvider);
  const app = createApp({ memoryService, embeddingProvider });

  it('stores and retrieves memories via HTTP', async () => {
    const storeResponse = await request(app)
      .post('/api/memory/store')
      .send({
        sessionId,
        text: 'User bought an iPhone 15 yesterday.',
        metadata: { source: 'chat' }
      });

    expect(storeResponse.status).toBe(201);
    expect(storeResponse.body.sessionId).toBe(sessionId);

    const retrieveResponse = await request(app)
      .post('/api/memory/retrieve')
      .send({
        sessionId,
        query: 'What products has the user bought?',
        limit: 3
      });

    expect(retrieveResponse.status).toBe(200);
    expect(retrieveResponse.body.results.length).toBeGreaterThan(0);
    expect(retrieveResponse.body.results[0].text).toContain('iPhone');
  });

  it('clears memories for a session', async () => {
    const clearResponse = await request(app).post('/api/memory/clear').send({ sessionId });
    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body.cleared).toBeGreaterThanOrEqual(0);
  });
});
