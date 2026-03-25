-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ad_groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "max_bid" REAL NOT NULL DEFAULT 10,
    "target_device" TEXT NOT NULL DEFAULT 'all',
    "target_category" TEXT,
    "targeting" TEXT,
    "is_all_publishers" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "ad_groups_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ad_groups" ("campaign_id", "id", "is_all_publishers", "max_bid", "name", "target_category", "target_device", "targeting") SELECT "campaign_id", "id", "is_all_publishers", "max_bid", "name", "target_category", "target_device", "targeting" FROM "ad_groups";
DROP TABLE "ad_groups";
ALTER TABLE "new_ad_groups" RENAME TO "ad_groups";
CREATE TABLE "new_ads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_group_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "target_url" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "ads_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "ad_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ads" ("ad_group_id", "description", "id", "image_url", "rejection_reason", "status", "target_url", "title") SELECT "ad_group_id", "description", "id", "image_url", "rejection_reason", "status", "target_url", "title" FROM "ads";
DROP TABLE "ads";
ALTER TABLE "new_ads" RENAME TO "ads";
CREATE TABLE "new_campaigns" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "advertiser_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "budget" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "daily_budget" REAL NOT NULL DEFAULT 0,
    "today_spent" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaigns_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_campaigns" ("advertiser_id", "budget", "created_at", "daily_budget", "end_date", "id", "name", "spent", "start_date", "today_spent") SELECT "advertiser_id", "budget", "created_at", "daily_budget", "end_date", "id", "name", "spent", "start_date", "today_spent" FROM "campaigns";
DROP TABLE "campaigns";
ALTER TABLE "new_campaigns" RENAME TO "campaigns";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
