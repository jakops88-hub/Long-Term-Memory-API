import { MemoryService } from '../src/services/memoryService';
import { FakeEmbeddingProvider, FakeMemoryRepository, FakeSessionRepository } from './fakes';

describe('MemoryService', () => {
  const sessionId = 'session-1';
  let memoryRepository: FakeMemoryRepository;
  let sessionRepository: FakeSessionRepository;
  let embeddingProvider: FakeEmbeddingProvider;
  let service: MemoryService;

  beforeEach(() => {
    memoryRepository = new FakeMemoryRepository();
    sessionRepository = new FakeSessionRepository();
    embeddingProvider = new FakeEmbeddingProvider(0.8, true);
    service = new MemoryService(memoryRepository, sessionRepository, embeddingProvider);
  });

  it('stores memory with importance score', async () => {
    const response = await service.storeMemory({
      sessionId,
      text: 'User bought an iPhone 15 yesterday.',
      metadata: { source: 'chat' },
      importanceHint: 'high'
    });

    expect(response.sessionId).toBe(sessionId);
    expect(response.id).toBeDefined();
    expect(response.importanceScore).toBeGreaterThan(0.5);
  });

  it('retrieves the most relevant memory', async () => {
    await service.storeMemory({
      sessionId,
      text: 'User bought an iPhone 15 yesterday.',
      metadata: { source: 'chat' }
    });
    await service.storeMemory({
      sessionId,
      text: 'User mentioned liking pizza.',
      metadata: { source: 'chat' }
    });

    const result = await service.retrieveMemories({
      sessionId,
      query: 'What products has the user bought?',
      limit: 1
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].text).toContain('iPhone');
  });
});
