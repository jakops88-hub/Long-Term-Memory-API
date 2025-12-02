-- AlterTable
-- We need to clear existing embeddings because they are 512 dimensions and cannot be cast to 768.
-- If you want to keep the memories, we set embedding to NULL (if nullable) or delete the rows.
-- Assuming embedding is nullable based on schema "embedding Unsupported("vector(768)")?"

-- First, drop the index that depends on the column
DROP INDEX IF EXISTS "Memory_embedding_idx";

-- Alter the column type. Since we can't cast, we'll clear the data.
-- Note: If embedding is NOT NULL in the DB, this will fail unless we provide a default or allow null.
-- The schema says "embedding Unsupported("vector(768)")?", so it is nullable.

ALTER TABLE "Memory" ALTER COLUMN "embedding" TYPE vector(768) USING NULL;

-- Re-create the index
CREATE INDEX "Memory_embedding_idx" ON "Memory" USING hnsw ("embedding" vector_cosine_ops);
