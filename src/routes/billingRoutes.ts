import { Router } from 'express';
import { CostGuardService } from '../services/costGuardService';
import { z } from 'zod';

const router = Router();

const setBalanceSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(0)
});

const addCreditsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(1)
});

/**
 * GET /api/billing/balance/:userId
 * Get user's current balance
 */
router.get('/balance/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const balance = await CostGuardService.getBalance(userId);
    
    res.json({
      userId,
      balance,
      currency: 'credits'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/add-credits
 * Add credits to user's balance (for testing or Stripe webhook)
 */
router.post('/add-credits', async (req, res, next) => {
  try {
    const { userId, amount } = addCreditsSchema.parse(req.body);
    const newBalance = await CostGuardService.addCredits(userId, amount);
    
    res.json({
      userId,
      added: amount,
      newBalance,
      currency: 'credits'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/set-balance (Admin only)
 * Set user's balance directly
 */
router.post('/set-balance', async (req, res, next) => {
  try {
    const { userId, amount } = setBalanceSchema.parse(req.body);
    await CostGuardService.setBalance(userId, amount);
    
    res.json({
      userId,
      balance: amount,
      currency: 'credits'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
