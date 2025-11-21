"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memoryService_1 = require("../src/services/memoryService");
const fakes_1 = require("./fakes");
describe('pruning old memories', () => {
    const sessionId = 'prune-session';
    let memoryRepo;
    let sessionRepo;
    let service;
    beforeEach(() => {
        memoryRepo = new fakes_1.FakeMemoryRepository();
        sessionRepo = new fakes_1.FakeSessionRepository();
        service = new memoryService_1.MemoryService(memoryRepo, sessionRepo, new fakes_1.FakeEmbeddingProvider(0.1, false));
    });
    it('prunes stale, low-importance memories and keeps recent ones', async () => {
        // Low-importance, stale memory
        const oldMemory = await memoryRepo.create({
            sessionId,
            text: 'old log entry',
            compressedText: 'old log entry',
            importanceScore: 0.1
        });
        const ninetyFiveDaysAgo = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        memoryRepo.setTimestamps(oldMemory.id, ninetyFiveDaysAgo, sixtyDaysAgo);
        // Recent, important memory
        await memoryRepo.create({
            sessionId,
            text: 'recent purchase of a laptop for $2200',
            compressedText: 'recent purchase of a laptop',
            importanceScore: 0.8
        });
        const result = await service.pruneOldMemories({
            maxAgeDays: 90,
            inactiveDays: 30,
            importanceThreshold: 0.3
        });
        expect(result.pruned).toBe(1);
        expect(result.candidates).toBe(1);
    });
});
//# sourceMappingURL=pruning.test.js.map