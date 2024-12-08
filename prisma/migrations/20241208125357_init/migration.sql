/*
  Warnings:

  - You are about to drop the column `email` on the `auth.users` table. All the data in the column will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `auth.users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `auth.users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `auth.users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `auth.users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "auth.users_email_key";

-- AlterTable
ALTER TABLE "auth.users" DROP COLUMN "email",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "user_id" DROP DEFAULT;

-- DropTable
DROP TABLE "profiles";

-- CreateIndex
CREATE UNIQUE INDEX "auth.users_user_id_key" ON "auth.users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth.users_username_key" ON "auth.users"("username");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth.users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
