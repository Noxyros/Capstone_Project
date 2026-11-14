CREATE TABLE "PracticeBankAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submoduleId" TEXT NOT NULL,
    "questionIds" TEXT[] NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeBankAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeBankAttempt_user_submodule_status_expiry_idx"
ON "PracticeBankAttempt"("userId", "submoduleId", "completedAt", "expiresAt");

ALTER TABLE "PracticeBankAttempt"
ADD CONSTRAINT "PracticeBankAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeBankAttempt"
ADD CONSTRAINT "PracticeBankAttempt_submoduleId_fkey"
FOREIGN KEY ("submoduleId") REFERENCES "Submodule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
