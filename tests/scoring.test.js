"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scoring_1 = require("../src/utils/scoring");
describe('scoring utils', () => {
    it('weights similarity, recency, and importance', () => {
        const recent = (0, scoring_1.computeFinalScore)({ similarity: 0.9, recencyMs: 1000, importanceScore: 0.8 });
        const stale = (0, scoring_1.computeFinalScore)({
            similarity: 0.1,
            recencyMs: 1000 * 60 * 60 * 24 * 5,
            importanceScore: 0.2
        });
        expect(recent.finalScore).toBeGreaterThan(stale.finalScore);
        expect(recent.recencyScore).toBeGreaterThan(stale.recencyScore);
    });
    it('recency score decays over time', () => {
        const nowScore = (0, scoring_1.computeRecencyScore)(0);
        const futureScore = (0, scoring_1.computeRecencyScore)(1000 * 60 * 60 * 24 * 30); // 30 days
        expect(nowScore).toBeGreaterThan(futureScore);
        expect(nowScore).toBeLessThanOrEqual(1);
    });
});
//# sourceMappingURL=scoring.test.js.map