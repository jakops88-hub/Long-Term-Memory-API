/*
  Warnings:

  - You are about to drop the column `text_search` on the `Memory` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Memory_contentSearch_idx";

-- DropIndex
DROP INDEX "Memory_embedding_idx";

-- DropIndex
DROP INDEX "Memory_text_search_idx";

-- AlterTable
ALTER TABLE "Memory" DROP COLUMN "text_search",
ALTER COLUMN "contentSearch" DROP DEFAULT;
