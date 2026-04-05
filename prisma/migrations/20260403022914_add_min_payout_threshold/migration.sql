-- DropIndex
DROP INDEX "ads_ad_group_id_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_publishers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "total_earnings" REAL NOT NULL DEFAULT 0,
    "rev_share" REAL NOT NULL DEFAULT 0.7,
    "min_payout_threshold" REAL NOT NULL DEFAULT 5000
);
INSERT INTO "new_publishers" ("balance", "category", "id", "name", "rev_share", "total_earnings") SELECT "balance", "category", "id", "name", "rev_share", "total_earnings" FROM "publishers";
DROP TABLE "publishers";
ALTER TABLE "new_publishers" RENAME TO "publishers";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
