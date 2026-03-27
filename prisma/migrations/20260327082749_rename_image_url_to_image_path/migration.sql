-- CreateTable
CREATE TABLE "dismissed_alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "advertiser_id" INTEGER NOT NULL,
    "alert_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_alerts_advertiser_id_alert_type_entity_id_key" ON "dismissed_alerts"("advertiser_id", "alert_type", "entity_id");
