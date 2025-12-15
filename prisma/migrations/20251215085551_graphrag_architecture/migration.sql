/*
  Warnings:

  - You are about to drop the column `sessionId` on the `Memory` table. All the data in the column will be lost.
  - You are about to drop the column `text_search` on the `Memory` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Memory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Memory" DROP CONSTRAINT "Memory_sessionId_fkey";

-- DropIndex
DROP INDEX "Memory_contentSearch_idx";

-- DropIndex
DROP INDEX "Memory_embedding_idx";

-- DropIndex
DROP INDEX "Memory_sessionId_createdAt_idx";

-- DropIndex
DROP INDEX "Memory_sessionId_importanceScore_idx";

-- DropIndex
DROP INDEX "Memory_sessionId_isDeleted_idx";

-- DropIndex
DROP INDEX "Memory_text_search_idx";

-- AlterTable: Drop the generated column first, then recreate it
ALTER TABLE "Memory" DROP COLUMN "sessionId",
DROP COLUMN "text_search",
ALTER COLUMN "contentSearch" DROP EXPRESSION;

ALTER TABLE "Memory" DROP COLUMN "contentSearch";

ALTER TABLE "Memory" ADD COLUMN     "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "isConsolidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceEntityId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "compressedText" DROP NOT NULL,
ALTER COLUMN "importanceScore" SET DEFAULT 0.5;

-- Re-add contentSearch as a generated column
ALTER TABLE "Memory" ADD COLUMN "contentSearch" tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBilling" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditsBalance" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "embedding" vector(768),
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "predicate" TEXT NOT NULL,
    "metadata" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserBilling_userId_key" ON "UserBilling"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBilling_stripeCustomerId_key" ON "UserBilling"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "UserBilling_userId_idx" ON "UserBilling"("userId");

-- CreateIndex
CREATE INDEX "UserBilling_tier_idx" ON "UserBilling"("tier");

-- CreateIndex
CREATE INDEX "Entity_userId_type_idx" ON "Entity"("userId", "type");

-- CreateIndex
CREATE INDEX "Entity_userId_importance_idx" ON "Entity"("userId", "importance");

-- CreateIndex
CREATE INDEX "Entity_userId_isDeleted_idx" ON "Entity"("userId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_userId_name_type_key" ON "Entity"("userId", "name", "type");

-- CreateIndex
CREATE INDEX "Relationship_userId_fromEntityId_idx" ON "Relationship"("userId", "fromEntityId");

-- CreateIndex
CREATE INDEX "Relationship_userId_toEntityId_idx" ON "Relationship"("userId", "toEntityId");

-- CreateIndex
CREATE INDEX "Relationship_userId_predicate_idx" ON "Relationship"("userId", "predicate");

-- CreateIndex
CREATE INDEX "Relationship_userId_isDeleted_idx" ON "Relationship"("userId", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_userId_fromEntityId_toEntityId_predicate_key" ON "Relationship"("userId", "fromEntityId", "toEntityId", "predicate");

-- CreateIndex
CREATE INDEX "Memory_userId_createdAt_idx" ON "Memory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Memory_userId_importanceScore_idx" ON "Memory"("userId", "importanceScore");

-- CreateIndex
CREATE INDEX "Memory_userId_isDeleted_idx" ON "Memory"("userId", "isDeleted");

-- CreateIndex
CREATE INDEX "Memory_isConsolidated_idx" ON "Memory"("isConsolidated");

-- CreateIndex: Re-create GIN index for full-text search
CREATE INDEX "Memory_contentSearch_idx" ON "Memory" USING GIN ("contentSearch");

-- AddForeignKey
ALTER TABLE "UserBilling" ADD CONSTRAINT "UserBilling_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
