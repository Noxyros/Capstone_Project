-- AlterTable
ALTER TABLE "User" ADD COLUMN     "supabaseAuthId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAuthId_key" ON "User"("supabaseAuthId");
