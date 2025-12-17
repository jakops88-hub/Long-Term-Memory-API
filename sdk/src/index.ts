/**
 * MemVault SDK - Official TypeScript/JavaScript Client
 * 
 * @example
 * ```typescript
 * import { MemVault } from '@memvault/client';
 * 
 * const client = new MemVault(process.env.MEMVAULT_API_KEY);
 * 
 * // Add a memory
 * await client.addMemory("Our Q4 budget meeting concluded with a 15% increase");
 * 
 * // Ask questions
 * const answer = await client.ask("What was decided about the budget?");
 * console.log(answer.answer);
 * ```
 */

export { MemVault } from './client';
export * from './types';
export * from './errors';
