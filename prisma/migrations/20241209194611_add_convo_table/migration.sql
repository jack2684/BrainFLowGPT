-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowData" JSONB NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");
