/*
  Warnings:

  - A unique constraint covering the columns `[click_id]` on the table `clicks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clicks" ADD COLUMN "click_id" TEXT;

-- CreateTable
CREATE TABLE "conversion_rules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "advertiser_id" INTEGER NOT NULL,
    "url_pattern" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "revenue" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversion_rules_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "click_id" TEXT NOT NULL,
    "rule_id" INTEGER NOT NULL,
    "revenue" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversions_click_id_fkey" FOREIGN KEY ("click_id") REFERENCES "clicks" ("click_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "conversion_rules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "clicks_click_id_key" ON "clicks"("click_id");
