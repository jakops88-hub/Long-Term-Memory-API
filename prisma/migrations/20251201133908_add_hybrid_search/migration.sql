-- AlterTable
ALTER TABLE "Memory" ADD COLUMN "contentSearch" tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;
ALTER TABLE "Memory" ALTER COLUMN "embedding" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Memory_contentSearch_idx" ON "Memory" USING GIN ("contentSearch");
