-- CreateTable
CREATE TABLE "ad_group_auction_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_group_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auction_count" INTEGER NOT NULL DEFAULT 0,
    "win_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ad_group_auction_stats_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "ad_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_group_auction_stats_ad_group_id_date_key" ON "ad_group_auction_stats"("ad_group_id", "date");
