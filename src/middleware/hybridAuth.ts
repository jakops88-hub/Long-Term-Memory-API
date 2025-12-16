import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { UserContext, UserSource, UserTier } from '../types/billing';
import { ApiError } from '../types/errors';

/**
 * Extended Express Request with user context
 */
export interface AuthenticatedRequest extends Request {
  userContext?: UserContext;
}

/**
 * Hybrid Authentication Middleware
 * 
 * Identifies user source (RapidAPI or Direct) and attaches UserContext to request
 * 
 * Priority:
 * 1. Check for x-rapidapi-proxy-secret -> RapidAPI user
 * 2. Check for Authorization: Bearer sk_... -> Direct user
 * 3. Reject if neither present
 */
export async function hybridAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rapidApiSecret = req.headers['x-rapidapi-proxy-secret'] as string | undefined;
    const authHeader = req.headers.authorization;

    // ============================================================================
    // RAPIDAPI USERS
    // ============================================================================
    if (rapidApiSecret) {
      logger.debug('RapidAPI request detected', {
        path: req.path,
        method: req.method
      });

      // Validate RapidAPI secret
      if (rapidApiSecret !== process.env.RAPIDAPI_PROXY_SECRET) {
        throw new ApiError({
          code: 'INVALID_RAPIDAPI_SECRET',
          status: 401,
          message: 'Invalid RapidAPI proxy secret'
        });
      }

      // Extract user ID from RapidAPI headers
      const rapidApiUser = req.headers['x-rapidapi-user'] as string | undefined;
      
      if (!rapidApiUser) {
        throw new ApiError({
          code: 'MISSING_RAPIDAPI_USER',
          status: 400,
          message: 'Missing x-rapidapi-user header'
        });
      }

      // Get or create user in our system
      const user = await getOrCreateRapidApiUser(rapidApiUser);

      // Attach context
      req.userContext = {
        userId: user.id,
        source: 'RAPIDAPI',
        tier: user.tier as UserTier,
        balance: 0 // Not used for RapidAPI users
      };

      logger.info('RapidAPI user authenticated', {
        userId: user.id,
        tier: user.tier,
        rapidApiUser
      });

      return next();
    }

    // ============================================================================
    // DIRECT USERS (Stripe/JWT)
    // ============================================================================
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      logger.debug('Direct user request detected', {
        path: req.path,
        method: req.method
      });

      // Validate token (simple API key for now, JWT later)
      const user = await validateDirectUserToken(token);

      if (!user) {
        throw new ApiError({
          code: 'INVALID_TOKEN',
          status: 401,
          message: 'Invalid or expired authentication token'
        });
      }

      // Get billing info
      const billing = await prisma.userBilling.findUnique({
        where: { userId: user.id },
        select: {
          creditsBalance: true,
          tier: true
        }
      });

      if (!billing) {
        throw new ApiError({
          code: 'BILLING_NOT_FOUND',
          status: 404,
          message: 'User billing information not found'
        });
      }

      // Attach context
      req.userContext = {
        userId: user.id,
        source: 'DIRECT',
        tier: billing.tier as UserTier,
        balance: billing.creditsBalance
      };

      logger.info('Direct user authenticated', {
        userId: user.id,
        tier: billing.tier,
        balance: billing.creditsBalance
      });

      return next();
    }

    // ============================================================================
    // NO AUTH PROVIDED
    // ============================================================================
    throw new ApiError({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Authentication required. Provide either x-rapidapi-proxy-secret or Authorization header.'
    });

  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path
    });

    next(new ApiError({
      code: 'AUTH_FAILED',
      status: 500,
      message: 'Authentication failed'
    }));
  }
}

/**
 * Get or create RapidAPI user in our system
 * 
 * @param rapidApiUserId - RapidAPI user identifier
 * @returns User record
 */
async function getOrCreateRapidApiUser(rapidApiUserId: string) {
  const email = `${rapidApiUserId}@rapidapi.memvault.com`;

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email },
    include: { billing: true }
  });

  if (!user) {
    logger.info('Creating new RapidAPI user', { rapidApiUserId });

    // Create user with billing
    user = await prisma.user.create({
      data: {
        email,
        billing: {
          create: {
            tier: 'HOBBY', // Default tier for RapidAPI users
            creditsBalance: 0 // Not used
          }
        }
      },
      include: { billing: true }
    });
  }

  return {
    id: user.id,
    tier: user.billing?.tier || 'HOBBY'
  };
}

/**
 * Validate Direct user token (API key or JWT)
 * 
 * @param token - Authentication token
 * @returns User if valid, null otherwise
 */
async function validateDirectUserToken(token: string) {
  // Validate token format: should start with 'sk_' and be at least 32 chars
  if (!token.startsWith('sk_') || token.length < 32) {
    return null;
  }

  try {
    // Find user by API key
    const user = await prisma.user.findUnique({
      where: { apiKey: token },
      select: {
        id: true,
        email: true,
      }
    });

    return user;
  } catch (error) {
    logger.error('Error validating API key', { error });
    return null;
  }
}

/**
 * Optional: Middleware to require specific tier
 * 
 * @param allowedTiers - Array of allowed tiers
 */
export function requireTier(...allowedTiers: UserTier[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userContext) {
      return next(new ApiError({
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Authentication required'
      }));
    }

    if (!allowedTiers.includes(req.userContext.tier)) {
      return next(new ApiError({
        code: 'TIER_REQUIRED',
        status: 403,
        message: `This feature requires ${allowedTiers.join(' or ')} tier`
      }));
    }

    next();
  };
}

/**
 * Optional: Middleware to block RapidAPI users from specific endpoints
 */
export function blockRapidApi(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.userContext) {
    return next(new ApiError({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Authentication required'
    }));
  }

  if (req.userContext.source === 'RAPIDAPI') {
    return next(new ApiError({
      code: 'FEATURE_NOT_AVAILABLE',
      status: 403,
      message: 'This feature is not available for RapidAPI users'
    }));
  }

  next();
}
