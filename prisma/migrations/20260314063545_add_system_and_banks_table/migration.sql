-- CreateTable
CREATE TABLE "systems" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "timeRefund" INTEGER NOT NULL,
    "limitRefund" INTEGER NOT NULL,
    "comissionRate" DECIMAL(5,2) NOT NULL,
    "term" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "bankNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "banks" ADD CONSTRAINT "banks_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
