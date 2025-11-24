"use strict";
process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/memory_test';
process.env.NODE_ENV = 'test';
process.env.ENABLE_EMBEDDINGS = process.env.ENABLE_EMBEDDINGS || 'false';
process.env.WEIGHT_SIMILARITY = process.env.WEIGHT_SIMILARITY || '0.5';
process.env.WEIGHT_RECENCY = process.env.WEIGHT_RECENCY || '0.2';
process.env.WEIGHT_IMPORTANCE = process.env.WEIGHT_IMPORTANCE || '0.3';
process.env.MAX_TEXT_LENGTH = process.env.MAX_TEXT_LENGTH || '4000';
process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';
process.env.PRUNE_MAX_AGE_DAYS = process.env.PRUNE_MAX_AGE_DAYS || '90';
process.env.PRUNE_INACTIVE_DAYS = process.env.PRUNE_INACTIVE_DAYS || '30';
process.env.PRUNE_IMPORTANCE_THRESHOLD = process.env.PRUNE_IMPORTANCE_THRESHOLD || '0.3';
//# sourceMappingURL=setup.js.map