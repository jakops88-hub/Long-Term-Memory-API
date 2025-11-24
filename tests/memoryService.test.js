"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memoryService_1 = require("../src/services/memoryService");
const fakes_1 = require("./fakes");
describe('MemoryService', () => {
    const sessionId = 'session-1';
    let memoryRepository;
    let sessionRepository;
    let embeddingProvider;
    let service;
    beforeEach(() => {
        memoryRepository = new fakes_1.FakeMemoryRepository();
        sessionRepository = new fakes_1.FakeSessionRepository();
        embeddingProvider = new fakes_1.FakeEmbeddingProvider(0.8, true);
        service = new memoryService_1.MemoryService(memoryRepository, sessionRepository, embeddingProvider);
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
//# sourceMappingURL=memoryService.test.js.map