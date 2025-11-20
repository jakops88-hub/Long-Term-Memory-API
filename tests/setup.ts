process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/memory_test';
process.env.NODE_ENV = 'test';
process.env.ENABLE_EMBEDDINGS = process.env.ENABLE_EMBEDDINGS || 'false';
process.env.SCORING_WEIGHT_SIMILARITY = process.env.SCORING_WEIGHT_SIMILARITY || '0.5';
process.env.SCORING_WEIGHT_RECENCY = process.env.SCORING_WEIGHT_RECENCY || '0.2';
process.env.SCORING_WEIGHT_IMPORTANCE = process.env.SCORING_WEIGHT_IMPORTANCE || '0.3';
process.env.MAX_TEXT_LENGTH = process.env.MAX_TEXT_LENGTH || '4000';
