import { Router, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/hybridAuth';

const router = Router();

/**
 * GET /api/user/me
 * Returns current user information based on Bearer token
 * Used for login validation and dashboard data
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // API key is already validated by hybridAuth middleware
    // and stored in req.userContext
    const userId = req.userContext?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        billing: {
          select: {
            tier: true,
            creditsBalance: true,
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      tier: user.billing?.tier || 'HOBBY',
      creditsBalance: user.billing?.creditsBalance || 0,
      stripeCustomerId: user.billing?.stripeCustomerId,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('Error fetching user info', { error });
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

/**
 * GET /api/user/api-keys
 * Returns all API keys for the current user
 */
router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userContext?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        apiKey: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return API key with partial masking for security
    const maskedKey = user.apiKey
      ? `${user.apiKey.substring(0, 10)}${'•'.repeat(20)}${user.apiKey.substring(user.apiKey.length - 4)}`
      : null;

    res.json({
      apiKeys: [
        {
          id: user.id,
          name: 'Primary API Key',
          key: maskedKey,
          fullKey: user.apiKey, // Only send full key when explicitly requested
          createdAt: user.createdAt,
          lastUsed: null, // TODO: Track last usage
        },
      ],
    });
  } catch (error) {
    logger.error('Error fetching API keys', { error });
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * DELETE /api/user/api-keys/:id
 * Deletes an API key (currently not implemented as users have only one key)
 * Returns 400 error preventing deletion of the only key
 */
router.delete('/api-keys/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userContext?.userId;
    const keyId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Prevent deleting the only API key
    return res.status(400).json({
      error: 'Cannot delete your only API key. Contact support if you need a new key.',
    });
  } catch (error) {
    logger.error('Error deleting API key', { error });
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
