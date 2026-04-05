-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_dismissed_alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "advertiser_id" INTEGER,
    "publisher_id" INTEGER,
    "alert_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_dismissed_alerts" ("advertiser_id", "alert_type", "created_at", "entity_id", "id") SELECT "advertiser_id", "alert_type", "created_at", "entity_id", "id" FROM "dismissed_alerts";
DROP TABLE "dismissed_alerts";
ALTER TABLE "new_dismissed_alerts" RENAME TO "dismissed_alerts";
CREATE UNIQUE INDEX "dismissed_alerts_advertiser_id_alert_type_entity_id_key" ON "dismissed_alerts"("advertiser_id", "alert_type", "entity_id");
CREATE UNIQUE INDEX "dismissed_alerts_publisher_id_alert_type_entity_id_key" ON "dismissed_alerts"("publisher_id", "alert_type", "entity_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
