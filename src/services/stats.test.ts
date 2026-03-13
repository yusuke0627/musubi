import { describe, it, expect, beforeEach } from 'vitest';
import db, { initSchema } from '@/lib/db';
import { getDailyStats, getPlacementStats } from './stats';

describe('getDailyStats', () => {
  beforeEach(() => {
    // 各テストの前にスキーマをリセット（インメモリDBをクリーンにする）
    db.exec('DROP TABLE IF EXISTS ad_group_target_publishers');
    db.exec('DROP TABLE IF EXISTS ad_schedules');
    db.exec('DROP TABLE IF EXISTS clicks');
    db.exec('DROP TABLE IF EXISTS impressions');
    db.exec('DROP TABLE IF EXISTS payouts');
    db.exec('DROP TABLE IF EXISTS ads');
    db.exec('DROP TABLE IF EXISTS ad_groups');
    db.exec('DROP TABLE IF EXISTS campaigns');
    db.exec('DROP TABLE IF EXISTS publishers');
    db.exec('DROP TABLE IF EXISTS advertisers');
    initSchema(db);
  });

  it('should return 7 days of statistics', () => {
    const stats = getDailyStats() as any[];
    expect(stats).toHaveLength(7);
    
    // 直近の日付が含まれているか確認
    const today = new Date().toISOString().split('T')[0];
    expect(stats[6].date).toBe(today);
  });

  it('should aggregate impressions and clicks correctly', () => {
    // テストデータの投入
    db.prepare("INSERT INTO advertisers (id, name) VALUES (1, 'Test Adv')").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Test Pub', 'example.com')").run();
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Test Camp')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name) VALUES (1, 1, 'Test Group')").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url) VALUES (1, 1, 'Test Ad', 'http://test.com')").run();

    const today = new Date().toISOString().split('T')[0];
    
    // インプレッション挿入
    db.prepare('INSERT INTO impressions (ad_id, publisher_id, created_at) VALUES (1, 1, ?)').run(`${today} 10:00:00`);
    db.prepare('INSERT INTO impressions (ad_id, publisher_id, created_at) VALUES (1, 1, ?)').run(`${today} 11:00:00`);
    
    // 有効なクリック挿入
    db.prepare('INSERT INTO clicks (ad_id, publisher_id, is_valid, created_at) VALUES (1, 1, 1, ?)').run(`${today} 10:30:00`);
    
    // 無効なクリック挿入（カウントされないはず）
    db.prepare('INSERT INTO clicks (ad_id, publisher_id, is_valid, created_at) VALUES (1, 1, 0, ?)').run(`${today} 10:35:00`);

    const stats = getDailyStats() as any[];
    const todayStats = stats.find((s: any) => s.date === today);
    
    expect(todayStats).toBeDefined();
    expect(todayStats?.impressions).toBe(2);
    expect(todayStats?.clicks).toBe(1);
  });

  it('should filter by publisherId correctly', () => {
    db.prepare("INSERT INTO advertisers (id, name) VALUES (1, 'Test Adv')").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Pub 1', 'p1.com')").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (2, 'Pub 2', 'p2.com')").run();
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Test Camp')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name) VALUES (1, 1, 'Test Group')").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url) VALUES (1, 1, 'Test Ad', 'http://test.com')").run();

    const today = new Date().toISOString().split('T')[0];
    
    db.prepare('INSERT INTO impressions (ad_id, publisher_id, created_at) VALUES (1, 1, ?)').run(`${today} 10:00:00`);
    db.prepare('INSERT INTO impressions (ad_id, publisher_id, created_at) VALUES (1, 2, ?)').run(`${today} 11:00:00`);

    const statsForPub1 = getDailyStats({ publisherId: '1' }) as any[];
    const todayStats1 = statsForPub1.find((s: any) => s.date === today);
    expect(todayStats1?.impressions).toBe(1);

    const statsForPub2 = getDailyStats({ publisherId: '2' }) as any[];
    const todayStats2 = statsForPub2.find((s: any) => s.date === today);
    expect(todayStats2?.impressions).toBe(1);
  });
});

describe('getPlacementStats', () => {
  beforeEach(() => {
    db.exec('DROP TABLE IF EXISTS ad_group_target_publishers');
    db.exec('DROP TABLE IF EXISTS ad_schedules');
    db.exec('DROP TABLE IF EXISTS clicks');
    db.exec('DROP TABLE IF EXISTS impressions');
    db.exec('DROP TABLE IF EXISTS payouts');
    db.exec('DROP TABLE IF EXISTS ads');
    db.exec('DROP TABLE IF EXISTS ad_groups');
    db.exec('DROP TABLE IF EXISTS campaigns');
    db.exec('DROP TABLE IF EXISTS publishers');
    db.exec('DROP TABLE IF EXISTS advertisers');
    initSchema(db);
  });

  it('should return placement statistics for an advertiser', () => {
    // テストデータの投入
    db.prepare("INSERT INTO advertisers (id, name) VALUES (1, 'Adv 1')").run();
    db.prepare("INSERT INTO advertisers (id, name) VALUES (2, 'Adv 2')").run();
    
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Pub 1', 'p1.com')").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (2, 'Pub 2', 'p2.com')").run();
    
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Camp 1')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name) VALUES (1, 1, 'Group 1')").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url) VALUES (1, 1, 'Ad 1', 'http://a1.com')").run();

    // 広告主1のインプレッションとクリック
    db.prepare('INSERT INTO impressions (ad_id, publisher_id) VALUES (1, 1)').run();
    db.prepare('INSERT INTO impressions (ad_id, publisher_id) VALUES (1, 1)').run();
    db.prepare('INSERT INTO impressions (ad_id, publisher_id) VALUES (1, 2)').run();
    db.prepare('INSERT INTO clicks (ad_id, publisher_id, is_valid, processed) VALUES (1, 1, 1, 1)').run();

    const stats = getPlacementStats('1') as any[];
    
    expect(stats).toHaveLength(2);
    
    const pub1 = stats.find(s => s.id === 1);
    expect(pub1?.impressions).toBe(2);
    expect(pub1?.clicks).toBe(1);
    
    const pub2 = stats.find(s => s.id === 2);
    expect(pub2?.impressions).toBe(1);
    expect(pub2?.clicks).toBe(0);

    // 他の広告主の結果が含まれないことの確認
    const statsForAdv2 = getPlacementStats('2') as any[];
    expect(statsForAdv2).toHaveLength(0);
  });
});
