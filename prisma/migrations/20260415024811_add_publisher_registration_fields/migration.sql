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
    "min_payout_threshold" REAL NOT NULL DEFAULT 5000,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contact_name" TEXT,
    "entity_type" TEXT NOT NULL DEFAULT 'individual',
    "bank_name" TEXT,
    "bank_branch" TEXT,
    "account_type" TEXT,
    "account_number" TEXT,
    "account_name" TEXT
);
INSERT INTO "new_publishers" ("balance", "category", "id", "min_payout_threshold", "name", "rev_share", "total_earnings") SELECT "balance", "category", "id", "min_payout_threshold", "name", "rev_share", "total_earnings" FROM "publishers";
DROP TABLE "publishers";
ALTER TABLE "new_publishers" RENAME TO "publishers";
CREATE UNIQUE INDEX "publishers_email_key" ON "publishers"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
