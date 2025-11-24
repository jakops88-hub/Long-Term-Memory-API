/*
  Warnings:

  - Changed the type of `embedding` on the `Memory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Memory" DROP COLUMN "embedding",
ADD COLUMN     "embedding" vector(512) NOT NULL;

-- Create HNSW index for faster cosine similarity search
CREATE INDEX ON "Memory" USING HNSW (embedding vector_cosine_ops);