"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const text_1 = require("../src/utils/text");
describe('importance scoring', () => {
    it('boosts importance when numbers, dates, and money are present', () => {
        const text = 'User bought a Tesla Model 3 for $45,000 on 2024-08-01.';
        const score = (0, text_1.computeImportanceScore)(text, 'high');
        expect(score).toBeGreaterThan(0.7);
        expect(score).toBeLessThanOrEqual(1);
    });
    it('keeps short casual text low', () => {
        const text = 'hello there';
        const score = (0, text_1.computeImportanceScore)(text, 'low');
        expect(score).toBeLessThan(0.5);
        expect(score).toBeGreaterThanOrEqual(0);
    });
    it('uses hint to tilt scoring', () => {
        const base = (0, text_1.computeImportanceScore)('scheduled a meeting tomorrow', 'low');
        const boosted = (0, text_1.computeImportanceScore)('scheduled a meeting tomorrow', 'high');
        expect(boosted).toBeGreaterThan(base);
    });
    it('normalizes whitespace before scoring', () => {
        const text = (0, text_1.normalizeText)('User   bought   an iPhone    yesterday');
        const score = (0, text_1.computeImportanceScore)(text);
        expect(score).toBeGreaterThan(0.4);
    });
});
//# sourceMappingURL=importance.test.js.map