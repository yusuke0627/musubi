-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clicks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,
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
    CONSTRAINT "clicks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_clicks" ("ad_id", "campaign_id", "cost", "created_at", "id", "invalid_reason", "ip_address", "is_valid", "processed", "publisher_id", "user_agent") SELECT "ad_id", "campaign_id", "cost", "created_at", "id", "invalid_reason", "ip_address", "is_valid", "processed", "publisher_id", "user_agent" FROM "clicks";
DROP TABLE "clicks";
ALTER TABLE "new_clicks" RENAME TO "clicks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
