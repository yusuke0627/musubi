/*
  Warnings:

  - You are about to drop the column `domain` on the `publishers` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "apps" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publisher_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "bundle_id" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "apps_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ad_units" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "app_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ad_type" TEXT NOT NULL DEFAULT 'banner',
    "width" INTEGER,
    "height" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_units_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clicks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "click_id" TEXT,
    "ad_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,
    "ad_unit_id" INTEGER,
    "campaign_id" INTEGER,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "cost" REAL NOT NULL DEFAULT 0,
    "publisher_earnings" REAL NOT NULL DEFAULT 0,
    "is_valid" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "invalid_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clicks_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clicks_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clicks_ad_unit_id_fkey" FOREIGN KEY ("ad_unit_id") REFERENCES "ad_units" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "clicks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_clicks" ("ad_id", "campaign_id", "click_id", "cost", "created_at", "id", "invalid_reason", "ip_address", "is_valid", "processed", "publisher_earnings", "publisher_id", "user_agent") SELECT "ad_id", "campaign_id", "click_id", "cost", "created_at", "id", "invalid_reason", "ip_address", "is_valid", "processed", "publisher_earnings", "publisher_id", "user_agent" FROM "clicks";
DROP TABLE "clicks";
ALTER TABLE "new_clicks" RENAME TO "clicks";
CREATE UNIQUE INDEX "clicks_click_id_key" ON "clicks"("click_id");
CREATE TABLE "new_impressions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,
    "ad_unit_id" INTEGER,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "impressions_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "impressions_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "impressions_ad_unit_id_fkey" FOREIGN KEY ("ad_unit_id") REFERENCES "ad_units" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_impressions" ("ad_id", "created_at", "id", "ip_address", "publisher_id", "user_agent") SELECT "ad_id", "created_at", "id", "ip_address", "publisher_id", "user_agent" FROM "impressions";
DROP TABLE "impressions";
ALTER TABLE "new_impressions" RENAME TO "impressions";
CREATE TABLE "new_publishers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "total_earnings" REAL NOT NULL DEFAULT 0,
    "rev_share" REAL NOT NULL DEFAULT 0.7
);
INSERT INTO "new_publishers" ("balance", "category", "id", "name", "rev_share", "total_earnings") SELECT "balance", "category", "id", "name", "rev_share", "total_earnings" FROM "publishers";
DROP TABLE "publishers";
ALTER TABLE "new_publishers" RENAME TO "publishers";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
