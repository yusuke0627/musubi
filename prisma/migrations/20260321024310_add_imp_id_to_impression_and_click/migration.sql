/*
  Warnings:

  - A unique constraint covering the columns `[imp_id]` on the table `impressions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clicks" ADD COLUMN "imp_id" TEXT;

-- AlterTable
ALTER TABLE "impressions" ADD COLUMN "imp_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "impressions_imp_id_key" ON "impressions"("imp_id");
