-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "compressedText" TEXT NOT NULL,
    "metadata" JSONB,
    "importanceScore" DOUBLE PRECISION NOT NULL,
    "recencyScore" DOUBLE PRECISION,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_externalId_key" ON "Session"("externalId");

-- CreateIndex
CREATE INDEX "Memory_sessionId_createdAt_idx" ON "Memory"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Memory_sessionId_importanceScore_idx" ON "Memory"("sessionId", "importanceScore");

-- CreateIndex
CREATE INDEX "Memory_sessionId_isDeleted_idx" ON "Memory"("sessionId", "isDeleted");

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
