import { describe, it, expect, beforeEach, vi } from 'vitest';
import db, { initSchema } from '@/lib/db';
import { runBillingWorker } from './billing';

describe('runBillingWorker', () => {
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

  it('should process a valid click and update balances', () => {
    // データ投入
    db.prepare("INSERT INTO advertisers (id, name, balance) VALUES (1, 'Adv 1', 1000)").run();
    db.prepare("INSERT INTO publishers (id, name, domain, rev_share) VALUES (1, 'Pub 1', 'p1.com', 0.7)").run();
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Camp 1')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name, max_bid) VALUES (1, 1, 'Group 1', 100)").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url) VALUES (1, 1, 'Ad 1', 'http://t.com')").run();

    // 未処理クリック挿入
    db.prepare("INSERT INTO clicks (ad_id, publisher_id, ip_address, processed) VALUES (1, 1, '1.1.1.1', 0)").run();

    const processedCount = runBillingWorker();
    expect(processedCount).toBe(1);

    // 広告主の残高確認 (1000 - 100 = 900)
    const adv = db.prepare('SELECT balance FROM advertisers WHERE id = 1').get() as any;
    expect(adv.balance).toBe(900);

    // パブリッシャーの残高確認 (0 + 100 * 0.7 = 70)
    const pub = db.prepare('SELECT balance, total_earnings FROM publishers WHERE id = 1').get() as any;
    expect(pub.balance).toBe(70);
    expect(pub.total_earnings).toBe(70);

    // クリックの状態確認
    const click = db.prepare('SELECT is_valid, processed FROM clicks').get() as any;
    expect(click.is_valid).toBe(1);
    expect(click.processed).toBe(1);
  });

  it('should invalidate duplicate clicks within 10 seconds', () => {
    db.prepare("INSERT INTO advertisers (id, name, balance) VALUES (1, 'Adv 1', 1000)").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Pub 1', 'p1.com')").run();
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Camp 1')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name, max_bid) VALUES (1, 1, 'Group 1', 100)").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url) VALUES (1, 1, 'Ad 1', 'http://t.com')").run();

    const now = new Date().toISOString();
    
    // 同一IP、同一広告への連続クリック
    db.prepare("INSERT INTO clicks (ad_id, publisher_id, ip_address, processed, created_at) VALUES (1, 1, '1.1.1.1', 0, ?)").run(now);
    db.prepare("INSERT INTO clicks (ad_id, publisher_id, ip_address, processed, created_at) VALUES (1, 1, '1.1.1.1', 0, ?)").run(now);

    runBillingWorker();

    const clicks = db.prepare('SELECT is_valid, invalid_reason FROM clicks ORDER BY id ASC').all() as any[];
    expect(clicks[0].is_valid).toBe(1);
    expect(clicks[1].is_valid).toBe(0);
    expect(clicks[1].invalid_reason).toContain('Duplicate click');
    
    // 広告主の残高は1回分しか引かれないはず
    const adv = db.prepare('SELECT balance FROM advertisers WHERE id = 1').get() as any;
    expect(adv.balance).toBe(900);
  });

  it('should invalidate clicks if advertiser has insufficient balance', () => {
    // 残高50円、入札100円
    db.prepare("INSERT INTO advertisers (id, name, balance) VALUES (1, 'Adv 1', 50)").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Pub 1', 'p1.com')").run();
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Camp 1')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name, max_bid) VALUES (1, 1, 'Group 1', 100)").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url) VALUES (1, 1, 'Ad 1', 'http://t.com')").run();

    db.prepare("INSERT INTO clicks (ad_id, publisher_id, ip_address, processed) VALUES (1, 1, '1.1.1.1', 0)").run();

    runBillingWorker();

    const click = db.prepare('SELECT is_valid, invalid_reason FROM clicks').get() as any;
    expect(click.is_valid).toBe(0);
    expect(click.invalid_reason).toBe('Insufficient advertiser balance');

    const adv = db.prepare('SELECT balance FROM advertisers WHERE id = 1').get() as any;
    expect(adv.balance).toBe(50); // 減っていない
  });
});
