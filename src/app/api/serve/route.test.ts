import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import db, { initSchema } from '@/lib/db';
import { GET } from './route';

describe('GET /api/serve', () => {
  beforeEach(() => {
    // 子テーブルから先に削除する
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

    // テスト用のマスタデータを投入
    db.prepare("INSERT INTO advertisers (id, name, balance) VALUES (1, 'Adv 1', 1000)").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Pub 1', 'p1.com')").run();
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Camp 1')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name, max_bid, target_device, is_all_publishers) VALUES (1, 1, 'Group 1', 100, 'all', 1)").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, description, image_url, target_url, status) VALUES (1, 1, 'Ad 1', 'Desc 1', 'http://img.com', 'http://target.com', 'approved')").run();
  });

  it('should return 400 if publisher_id is missing', async () => {
    const req = new NextRequest('http://localhost/api/serve');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('publisher_id is required');
  });

  it('should serve an ad and record an impression', async () => {
    const req = new NextRequest('http://localhost/api/serve?publisher_id=1', {
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'x-forwarded-for': '1.2.3.4'
      }
    });
    
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html');
    
    const html = await res.text();
    expect(html).toContain('Ad 1');
    expect(html).toContain('http://img.com');
    expect(html).toContain('/api/click?ad_id=1&publisher_id=1');

    // DBにインプレッションが記録されているか確認
    const imp = db.prepare('SELECT * FROM impressions WHERE ad_id = 1 AND publisher_id = 1').get() as any;
    expect(imp).toBeDefined();
    expect(imp.ip_address).toBe('1.2.3.4');
  });

  it('should return 204 if no matching ad is found', async () => {
    // 広告を不承認にする
    db.prepare("UPDATE ads SET status = 'pending' WHERE id = 1").run();

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });

  it('should respect device targeting (mobile)', async () => {
    // アドグループをデスクトップ限定にする
    db.prepare("UPDATE ad_groups SET target_device = 'desktop' WHERE id = 1").run();

    // モバイル端末からのリクエスト (Mobi を含むUA)
    const req = new NextRequest('http://localhost/api/serve?publisher_id=1', {
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    const res = await GET(req);
    expect(res.status).toBe(204); // 配信されないはず
  });

  it('should not serve an ad if the campaign has not started yet', async () => {
    // 開始日を明日に設定
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().replace('T', ' ').split('.')[0];
    db.prepare("UPDATE campaigns SET start_date = ? WHERE id = 1").run(tomorrowIso);

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });

  it('should not serve an ad if the campaign has already ended', async () => {
    // 終了日を昨日に設定
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().replace('T', ' ').split('.')[0];
    db.prepare("UPDATE campaigns SET end_date = ? WHERE id = 1").run(yesterdayIso);

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });

  it('should respect ad group schedules', async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // 現在とは異なる曜日にスケジュールを設定 (例: 今日の曜日 + 1)
    const otherDay = (dayOfWeek + 1) % 7;
    db.prepare("INSERT INTO ad_schedules (ad_group_id, day_of_week, start_hour, end_hour) VALUES (1, ?, 0, 23)").run(otherDay);

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204); // スケジュール外なので配信されないはず

    // 現在の曜日・時間にスケジュールを合わせる
    db.prepare("DELETE FROM ad_schedules").run();
    db.prepare("INSERT INTO ad_schedules (ad_group_id, day_of_week, start_hour, end_hour) VALUES (1, ?, ?, ?)").run(dayOfWeek, hour, hour);

    const resOk = await GET(req);
    expect(resOk.status).toBe(200); // スケジュール内なので配信されるはず
  });

  it('should respect specific publisher targeting', async () => {
    // ターゲットを特定のパブリッシャー（ID: 99）に限定する
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (99, 'Target Pub', 't.com')").run();
    db.prepare("UPDATE ad_groups SET is_all_publishers = 0 WHERE id = 1").run();
    db.prepare("INSERT INTO ad_group_target_publishers (ad_group_id, publisher_id) VALUES (1, 99)").run();

    // 別のパブリッシャー（ID: 1）からのリクエスト
    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204); // 配信されないはず

    // ターゲットのパブリッシャー（ID: 99）からのリクエスト
    const reqOk = new NextRequest('http://localhost/api/serve?publisher_id=99');
    const resOk = await GET(reqOk);
    expect(resOk.status).toBe(200); // 配信されるはず
  });
});
