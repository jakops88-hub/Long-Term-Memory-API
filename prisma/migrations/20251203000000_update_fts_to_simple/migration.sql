-- DropIndex
DROP INDEX "Memory_contentSearch_idx";

-- AlterTable
ALTER TABLE "Memory" DROP COLUMN "contentSearch";
ALTER TABLE "Memory" ADD COLUMN "contentSearch" tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED;

-- CreateIndex
CREATE INDEX "Memory_contentSearch_idx" ON "Memory" USING GIN ("contentSearch");
