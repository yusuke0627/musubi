-- Rename image_url to image_path in the ads table
-- SQLite doesn't support direct column rename, so we use the recreate approach

-- Step 1: Add new column
ALTER TABLE "ads" ADD COLUMN "image_path" TEXT;

-- Step 2: Copy data from old column to new column
UPDATE "ads" SET "image_path" = "image_url";

-- Step 3: Create a new table with the desired schema (matching updated Prisma schema)
CREATE TABLE "ads_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_group_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_path" TEXT,
    "target_url" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    FOREIGN KEY ("ad_group_id") REFERENCES "ad_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 4: Copy data to the new table
INSERT INTO "ads_new" ("id", "ad_group_id", "title", "description", "image_path", "target_url", "review_status", "rejection_reason", "status")
SELECT "id", "ad_group_id", "title", "description", "image_path", "target_url", 
       COALESCE("review_status", 'pending') as "review_status", 
       "rejection_reason", 
       COALESCE("status", 'ACTIVE') as "status"
FROM "ads";

-- Step 5: Drop the old table
DROP TABLE "ads";

-- Step 6: Rename the new table to the original name
ALTER TABLE "ads_new" RENAME TO "ads";

-- Step 7: Recreate the index
CREATE INDEX "ads_ad_group_id_idx" ON "ads"("ad_group_id");
