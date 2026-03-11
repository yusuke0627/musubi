import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../adnetwork.db'));

// テーブル初期化
db.exec(`
  CREATE TABLE IF NOT EXISTS advertisers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS publishers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advertiser_id INTEGER,
    name TEXT NOT NULL,
    budget REAL DEFAULT 0,
    FOREIGN KEY(advertiser_id) REFERENCES advertisers(id)
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    target_url TEXT NOT NULL,
    max_bid REAL DEFAULT 10,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
  );

  CREATE TABLE IF NOT EXISTS impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_id INTEGER,
    publisher_id INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ad_id) REFERENCES ads(id),
    FOREIGN KEY(publisher_id) REFERENCES publishers(id)
  );

  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_id INTEGER,
    publisher_id INTEGER,
    user_agent TEXT,
    ip_address TEXT,
    is_valid INTEGER DEFAULT 1,
    processed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ad_id) REFERENCES ads(id),
    FOREIGN KEY(publisher_id) REFERENCES publishers(id)
  );
`);

// 初期データ投入（開発用）
const insertAdvertiser = db.prepare('INSERT OR IGNORE INTO advertisers (id, name, balance) VALUES (?, ?, ?)');
insertAdvertiser.run(1, 'Sample Advertiser (Rich)', 100000);
insertAdvertiser.run(2, 'Low Balance Advertiser (Poor)', 250); // 3回クリックで予算切れになる設定

const insertPublisher = db.prepare('INSERT OR IGNORE INTO publishers (id, name, domain) VALUES (?, ?, ?)');
insertPublisher.run(1, 'Sample Publisher Site', 'example.com');

const insertCampaign = db.prepare('INSERT OR IGNORE INTO campaigns (id, advertiser_id, name, budget) VALUES (?, ?, ?, ?)');
insertCampaign.run(1, 1, 'Winter Sale 2026', 50000);
insertCampaign.run(2, 2, 'Flash Sale', 500);

const insertAd = db.prepare('INSERT OR IGNORE INTO ads (id, campaign_id, title, description, image_url, target_url, max_bid) VALUES (?, ?, ?, ?, ?, ?, ?)');
// ID:1 は入札額 50円（2位）
insertAd.run(1, 1, 'New Shoes!', 'Get 20% off on all items.', 'https://placehold.jp/300x250.png?text=Rich+Ad+Shoes', 'https://google.com', 50);
// ID:2 は入札額 100円（1位）
insertAd.run(2, 2, 'Cheap Phone!', 'Limited offer for low budget.', 'https://placehold.jp/300x250.png?text=Poor+Ad+Phone', 'https://apple.com', 100);

export default db;
