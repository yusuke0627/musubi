import Database from 'better-sqlite3';
import path from 'path';

// Next.js のホットリロード対策（シングルトン）
const dbPath = path.join(process.cwd(), 'adnetwork.db');

const globalForDb = global as unknown as { db: Database.Database };

// テスト環境では常に新しいインメモリDBを返すようにする（個別のテストで制御するため、ここではシングルトンを避ける選択肢も残す）
export const db = (process.env.NODE_ENV === 'test') 
  ? new Database(':memory:') 
  : (globalForDb.db || new Database(dbPath));

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  globalForDb.db = db;
}

export function initSchema(database: Database.Database = db) {
  database.exec(`
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
      status TEXT DEFAULT 'pending',
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
      status TEXT DEFAULT 'pending',
      rejection_reason TEXT,
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
}

// 初期化実行
initSchema(db);

export default db;
