import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import db, { initSchema } from '@/lib/db';
import { GET } from './route';

describe('GET /api/click', () => {
  beforeEach(() => {
    db.exec('DROP TABLE IF EXISTS clicks');
    db.exec('DROP TABLE IF EXISTS impressions');
    db.exec('DROP TABLE IF EXISTS ads');
    db.exec('DROP TABLE IF EXISTS ad_groups');
    db.exec('DROP TABLE IF EXISTS campaigns');
    db.exec('DROP TABLE IF EXISTS publishers');
    db.exec('DROP TABLE IF EXISTS advertisers');
    initSchema(db);

    db.prepare("INSERT INTO advertisers (id, name, balance) VALUES (1, 'Adv 1', 1000)").run();
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Pub 1', 'p1.com')").run();
    db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Camp 1')").run();
    db.prepare("INSERT INTO ad_groups (id, campaign_id, name, max_bid) VALUES (1, 1, 'Group 1', 100)").run();
    db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url, status) VALUES (1, 1, 'Ad 1', 'http://target.com', 'approved')").run();
  });

  it('should return 400 if ad_id is missing', async () => {
    const req = new NextRequest('http://localhost/api/click');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('should record a click and redirect to the target URL', async () => {
    const req = new NextRequest('http://localhost/api/click?ad_id=1&publisher_id=1', {
      headers: {
        'user-agent': 'Mozilla/5.0...',
        'x-forwarded-for': '1.2.3.4'
      }
    });
    
    const res = await GET(req);
    
    // リダイレクトの検証 (Next.js のリダイレクトは 307 または 308)
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('http://target.com/');

    // DBにクリックが記録されているか確認（未処理状態で）
    const click = db.prepare('SELECT * FROM clicks WHERE ad_id = 1').get() as any;
    expect(click).toBeDefined();
    expect(click.processed).toBe(0);
    expect(click.ip_address).toBe('1.2.3.4');
  });

  it('should return 404 if ad is not found', async () => {
    const req = new NextRequest('http://localhost/api/click?ad_id=999');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
