"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeEmbeddingProvider = exports.FakeSessionRepository = exports.FakeMemoryRepository = void 0;
const crypto_1 = require("crypto");
class FakeMemoryRepository {
    constructor() {
        this.memories = [];
    }
    async create(data) {
        const memory = {
            id: (0, crypto_1.randomUUID)(),
            sessionId: data.sessionId,
            text: data.text,
            compressedText: data.compressedText,
            metadata: data.metadata ?? null,
            importanceScore: data.importanceScore,
            recencyScore: data.recencyScore ?? null,
            embedding: data.embedding ?? [],
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            isDeleted: false
        };
        this.memories.push(memory);
        return memory;
    }
    async listActiveBySession(sessionId, take = 200) {
        return this.memories
            .filter((m) => m.sessionId === sessionId && !m.isDeleted)
            .sort((a, b) => b.importanceScore - a.importanceScore || b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, take);
    }
    async updateLastAccessed(ids, timestamp) {
        this.memories = this.memories.map((m) => ids.includes(m.id) ? { ...m, lastAccessedAt: timestamp } : m);
    }
    async softDelete(sessionId, memoryIds) {
        let count = 0;
        this.memories = this.memories.map((m) => {
            const shouldDelete = m.sessionId === sessionId && !m.isDeleted && (!memoryIds || memoryIds.includes(m.id));
            if (shouldDelete) {
                count += 1;
                return { ...m, isDeleted: true };
            }
            return m;
        });
        return count;
    }
    async softDeleteByIds(ids) {
        let count = 0;
        this.memories = this.memories.map((m) => {
            if (ids.includes(m.id) && !m.isDeleted) {
                count += 1;
                return { ...m, isDeleted: true };
            }
            return m;
        });
        return count;
    }
    async findPrunable({ createdBefore, lastAccessedBefore, maxImportance, take = 200 }) {
        return this.memories
            .filter((m) => !m.isDeleted &&
            m.createdAt < createdBefore &&
            m.lastAccessedAt < lastAccessedBefore &&
            m.importanceScore <= maxImportance)
            .sort((a, b) => a.importanceScore - b.importanceScore || a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime())
            .slice(0, take);
    }
    async countActive(sessionId) {
        return this.memories.filter((m) => m.sessionId === sessionId && !m.isDeleted).length;
    }
    async latestAccessed(sessionId) {
        const latest = this.memories
            .filter((m) => m.sessionId === sessionId && !m.isDeleted)
            .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())[0];
        return latest?.lastAccessedAt ?? null;
    }
    // Test helper to mutate timestamps
    setTimestamps(id, createdAt, lastAccessedAt) {
        this.memories = this.memories.map((m) => m.id === id ? { ...m, createdAt, lastAccessedAt } : m);
    }
}
exports.FakeMemoryRepository = FakeMemoryRepository;
class FakeSessionRepository {
    constructor() {
        this.sessions = [];
    }
    async findById(id) {
        return this.sessions.find((s) => s.id === id) || null;
    }
    async upsert(id, externalId) {
        const existing = await this.findById(id);
        if (existing) {
            const updated = { ...existing, externalId: externalId ?? existing.externalId, updatedAt: new Date() };
            this.sessions = this.sessions.map((s) => (s.id === id ? updated : s));
            return updated;
        }
        const session = {
            id,
            externalId: externalId ?? null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.sessions.push(session);
        return session;
    }
    async countMemories(id) {
        // No-op here; callers in tests rely on MemoryRepository instead.
        return 0;
    }
    async summary(id) {
        const session = await this.findById(id);
        return { session, memoryCount: 0, lastAccessedAt: null };
    }
}
exports.FakeSessionRepository = FakeSessionRepository;
class FakeEmbeddingProvider {
    constructor(vectorValue = 0.5, enabled = true) {
        this.vectorValue = vectorValue;
        this.enabled = enabled;
    }
    isEnabled() {
        return this.enabled;
    }
    async generateEmbedding(text) {
        const seed = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) * this.vectorValue;
        return Array.from({ length: 8 }, (_v, idx) => ((seed + idx * 7) % 1000) / 1000);
    }
}
exports.FakeEmbeddingProvider = FakeEmbeddingProvider;
//# sourceMappingURL=fakes.js.map