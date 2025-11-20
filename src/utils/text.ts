import { ImportanceHint } from '../types/memory';
import { env } from '../config';

export const normalizeText = (text: string): string =>
  text.trim().replace(/\s+/g, ' ');

export const compressText = (text: string, max = 220): string => {
  if (text.length <= max) return text;
  return `${text.slice(0, max / 2).trim()} ... ${text.slice(-max / 2).trim()}`;
};

const hintScore = (hint?: ImportanceHint): number => {
  if (!hint) return 0.5;
  if (hint === 'high') return 0.9;
  if (hint === 'medium') return 0.6;
  return 0.3;
};

export const computeImportanceScore = (text: string, hint?: ImportanceHint): number => {
  const normalized = normalizeText(text);
  const lengthFactor = Math.min(normalized.length / env.maxTextLength, 1);
  const numericBoost = /\d{2,}/.test(normalized) ? 0.1 : 0;
  const decisionKeywords = /(bought|purchased|decided|planned|scheduled|deadline|deliver)/i.test(
    normalized
  )
    ? 0.15
    : 0;
  const entityBoost = /(\d{4}-\d{2}-\d{2}|yesterday|today|tomorrow|iphone|samsung|plan)/i.test(
    normalized
  )
    ? 0.1
    : 0;

  const base = 0.2 + lengthFactor * 0.3 + numericBoost + decisionKeywords + entityBoost;
  const combined = (base + hintScore(hint)) / 2;
  return Math.min(1, combined);
};

export const truncateIfNeeded = (text: string): string => {
  if (text.length <= env.maxTextLength) return text;
  return text.slice(0, env.maxTextLength);
};
