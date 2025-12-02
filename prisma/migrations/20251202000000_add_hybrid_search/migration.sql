-- AlterTable
ALTER TABLE "Memory" ADD COLUMN "text_search" tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;

-- CreateIndex
CREATE INDEX "Memory_text_search_idx" ON "Memory" USING GIN ("text_search");
