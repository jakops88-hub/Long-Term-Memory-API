"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const memoryService_1 = require("../src/services/memoryService");
const fakes_1 = require("./fakes");
describe('Memory routes', () => {
    const sessionId = 'route-session';
    const memoryRepository = new fakes_1.FakeMemoryRepository();
    const sessionRepository = new fakes_1.FakeSessionRepository();
    const embeddingProvider = new fakes_1.FakeEmbeddingProvider(0.6, true);
    const memoryService = new memoryService_1.MemoryService(memoryRepository, sessionRepository, embeddingProvider);
    const app = (0, app_1.createApp)({ memoryService, embeddingProvider });
    it('stores and retrieves memories via HTTP', async () => {
        const storeResponse = await (0, supertest_1.default)(app)
            .post('/api/memory/store')
            .send({
            sessionId,
            text: 'User bought an iPhone 15 yesterday.',
            metadata: { source: 'chat' }
        });
        expect(storeResponse.status).toBe(201);
        expect(storeResponse.body.sessionId).toBe(sessionId);
        const retrieveResponse = await (0, supertest_1.default)(app)
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
        const clearResponse = await (0, supertest_1.default)(app).post('/api/memory/clear').send({ sessionId });
        expect(clearResponse.status).toBe(200);
        expect(clearResponse.body.cleared).toBeGreaterThanOrEqual(0);
    });
});
//# sourceMappingURL=memoryRoutes.test.js.map