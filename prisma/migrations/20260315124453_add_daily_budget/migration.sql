-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_campaigns" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "advertiser_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "budget" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "daily_budget" REAL NOT NULL DEFAULT 0,
    "start_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" DATETIME,
    CONSTRAINT "campaigns_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_campaigns" ("advertiser_id", "budget", "end_date", "id", "name", "spent", "start_date") SELECT "advertiser_id", "budget", "end_date", "id", "name", "spent", "start_date" FROM "campaigns";
DROP TABLE "campaigns";
ALTER TABLE "new_campaigns" RENAME TO "campaigns";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
