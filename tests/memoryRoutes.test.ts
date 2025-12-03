import request from 'supertest';
import { createApp } from '../src/app';
import { MemoryService } from '../src/services/memoryService';
import { FakeMemoryRepository, FakeSessionRepository } from './fakes';
import { OpenAIEmbeddingProvider } from '../src/services/embeddings/OpenAIEmbeddingProvider';
import axios from 'axios';

// Mock axios to avoid real API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Memory routes', () => {
  const sessionId = 'route-session';
  const memoryRepository = new FakeMemoryRepository();
  const sessionRepository = new FakeSessionRepository();
  const embeddingProvider = new OpenAIEmbeddingProvider(); // Use OpenAI provider
  const memoryService = new MemoryService(memoryRepository, sessionRepository, embeddingProvider);
  const app = createApp({ memoryService, embeddingProvider });

  beforeEach(() => {
    // Reset mocks before each test
    mockedAxios.post.mockClear();
  });

  it('stores and retrieves memories via HTTP', async () => {
    // Mock the OpenAI API response for embeddings
    mockedAxios.post.mockResolvedValue({
      data: {
        data: [
          {
            embedding: Array.from({ length: 768 }, () => Math.random())
          }
        ]
      }
    });

    const storeResponse = await request(app)
      .post('/api/memory/store')
      .send({
        sessionId,
        text: 'User bought an iPhone 15 yesterday.',
        metadata: { source: 'chat' }
      });

    expect(storeResponse.status).toBe(201);
    expect(storeResponse.body.sessionId).toBe(sessionId);

    // Mock the response for the retrieval query
    mockedAxios.post.mockResolvedValue({
        data: {
          data: [
            {
              embedding: Array.from({ length: 512 }, () => Math.random())
            }
          ]
        }
      });

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