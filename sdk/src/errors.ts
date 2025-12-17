/**
 * Custom error classes for MemVault SDK
 */

export class MemVaultError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'MemVaultError';
  }
}

export class AuthenticationError extends MemVaultError {
  constructor(message: string = 'Invalid API key') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends MemVaultError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class InsufficientCreditsError extends MemVaultError {
  constructor(message: string = 'Insufficient credits') {
    super(message, 402);
    this.name = 'InsufficientCreditsError';
  }
}

export class ValidationError extends MemVaultError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}
