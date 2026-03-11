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
    domain TEXT NOT NULL,
    balance REAL DEFAULT 0,
    total_earnings REAL DEFAULT 0,
    rev_share REAL DEFAULT 0.7
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_id INTEGER,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY(publisher_id) REFERENCES publishers(id)
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advertiser_id INTEGER,
    name TEXT NOT NULL,
    budget REAL DEFAULT 0,
    FOREIGN KEY(advertiser_id) REFERENCES advertisers(id)
  );

  CREATE TABLE IF NOT EXISTS ad_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    name TEXT NOT NULL,
    max_bid REAL DEFAULT 10,
    target_device TEXT DEFAULT 'all',
    target_publisher_ids TEXT DEFAULT 'all',
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_group_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    target_url TEXT NOT NULL,
    FOREIGN KEY(ad_group_id) REFERENCES ad_groups(id)
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
    invalid_reason TEXT,
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
insertPublisher.run(2, 'Second Publisher Site', 'news.example.jp');

const insertCampaign = db.prepare('INSERT OR IGNORE INTO campaigns (id, advertiser_id, name, budget) VALUES (?, ?, ?, ?)');
insertCampaign.run(1, 1, 'Main Campaign (All)', 50000);
insertCampaign.run(2, 2, 'Flash Sale (Limited)', 500);

const insertAdGroup = db.prepare('INSERT OR IGNORE INTO ad_groups (id, campaign_id, name, max_bid, target_device, target_publisher_ids) VALUES (?, ?, ?, ?, ?, ?)');
// アドグループ1: 誰でもOK、入札50円
insertAdGroup.run(1, 1, 'Standard Group', 50, 'all', 'all');
// アドグループ2: モバイル/サイト1限定、入札100円
insertAdGroup.run(2, 2, 'Mobile Target Group', 100, 'mobile', '1');

const insertAd = db.prepare('INSERT OR IGNORE INTO ads (id, ad_group_id, title, description, image_url, target_url) VALUES (?, ?, ?, ?, ?, ?)');
// ID:1 はグループ1に紐付け
insertAd.run(1, 1, 'New Shoes!', 'Get 20% off on all items.', 'https://placehold.jp/300x250.png?text=Shoes+Ad', 'https://google.com');
// ID:2 はグループ2に紐付け
insertAd.run(2, 2, 'Cheap Phone!', 'Mobile only offer.', 'https://placehold.jp/300x250.png?text=Phone+Ad', 'https://apple.com');

export default db;
