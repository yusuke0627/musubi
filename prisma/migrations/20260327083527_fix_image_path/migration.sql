/*
  Warnings:

  - You are about to drop the column `image_url` on the `ads` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_group_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_path" TEXT,
    "target_url" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "ads_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "ad_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ads" ("ad_group_id", "description", "id", "rejection_reason", "review_status", "status", "target_url", "title") SELECT "ad_group_id", "description", "id", "rejection_reason", "review_status", "status", "target_url", "title" FROM "ads";
DROP TABLE "ads";
ALTER TABLE "new_ads" RENAME TO "ads";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
