import { redis } from '../config/redis';

export class CostGuardService {
  private static readonly BALANCE_KEY_PREFIX = 'user:balance:';

  /**
   * Get user's current balance
   */
  static async getBalance(userId: string): Promise<number> {
    const key = `${this.BALANCE_KEY_PREFIX}${userId}`;
    const balance = await redis.get(key);
    return balance ? parseInt(balance, 10) : 0;
  }

  /**
   * Check if user has sufficient balance
   */
  static async hasBalance(userId: string, minBalance: number = 1): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= minBalance;
  }

  /**
   * Deduct cost from user's balance atomically
   * Returns the new balance, or throws if insufficient
   */
  static async deductCost(userId: string, cost: number): Promise<number> {
    const key = `${this.BALANCE_KEY_PREFIX}${userId}`;
    
    // Use Lua script for atomic decrement with balance check
    const luaScript = `
      local key = KEYS[1]
      local cost = tonumber(ARGV[1])
      local balance = tonumber(redis.call('GET', key) or 0)
      
      if balance < cost then
        return -1
      end
      
      local newBalance = balance - cost
      redis.call('SET', key, newBalance)
      return newBalance
    `;

    const result = await redis.eval(luaScript, 1, key, cost.toString()) as number;

    if (result === -1) {
      throw new Error('Insufficient balance');
    }

    return result;
  }

  /**
   * Add credits to user's balance
   */
  static async addCredits(userId: string, amount: number): Promise<number> {
    const key = `${this.BALANCE_KEY_PREFIX}${userId}`;
    return await redis.incrby(key, amount);
  }

  /**
   * Set user's balance (for admin operations)
   */
  static async setBalance(userId: string, amount: number): Promise<void> {
    const key = `${this.BALANCE_KEY_PREFIX}${userId}`;
    await redis.set(key, amount.toString());
  }

  /**
   * Calculate cost based on token usage with profit margin
   */
  static calculateCost(tokens: number, costPer1k: number, profitMargin: number): number {
    const baseCost = (tokens / 1000) * costPer1k;
    return Math.ceil(baseCost * profitMargin * 100); // Convert to credits (cents)
  }
}
