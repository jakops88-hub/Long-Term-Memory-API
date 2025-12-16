-- AlterTable
ALTER TABLE "User" ADD COLUMN "apiKey" TEXT,
                   ADD COLUMN "source" TEXT NOT NULL DEFAULT 'DIRECT';

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE INDEX "User_apiKey_idx" ON "User"("apiKey");
