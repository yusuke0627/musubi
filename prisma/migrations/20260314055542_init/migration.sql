-- CreateTable
CREATE TABLE "advertisers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "total_earnings" REAL NOT NULL DEFAULT 0,
    "rev_share" REAL NOT NULL DEFAULT 0.7
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "linked_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publisher_id" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" DATETIME,
    CONSTRAINT "payouts_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "advertiser_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "budget" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "start_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" DATETIME,
    CONSTRAINT "campaigns_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ad_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_group_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_hour" INTEGER NOT NULL,
    "end_hour" INTEGER NOT NULL,
    CONSTRAINT "ad_schedules_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "ad_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ad_groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaign_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "max_bid" REAL NOT NULL DEFAULT 10,
    "target_device" TEXT NOT NULL DEFAULT 'all',
    "is_all_publishers" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ad_groups_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ad_group_target_publishers" (
    "ad_group_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,

    PRIMARY KEY ("ad_group_id", "publisher_id"),
    CONSTRAINT "ad_group_target_publishers_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "ad_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ad_group_target_publishers_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ads" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_group_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "target_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    CONSTRAINT "ads_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "ad_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "impressions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "impressions_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "impressions_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ad_id" INTEGER NOT NULL,
    "publisher_id" INTEGER NOT NULL,
    "campaign_id" INTEGER,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "cost" REAL NOT NULL DEFAULT 0,
    "is_valid" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "invalid_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clicks_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clicks_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clicks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
