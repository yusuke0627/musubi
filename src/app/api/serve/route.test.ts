import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { GET } from './route';
import { clearDatabase } from '@/lib/test-utils';

describe('GET /api/serve', () => {
  beforeEach(async () => {
    await clearDatabase();

    // Setup mock data
    await prisma.advertiser.create({ data: { id: 1, name: 'Adv 1', balance: 1000 } });
    await prisma.publisher.create({ data: { id: 1, name: 'Pub 1', domain: 'p1.com' } });
    await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Camp 1', budget: 1000, spent: 0 } });
    await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Group 1', max_bid: 100, target_device: 'all', is_all_publishers: 1 } });
    await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'Ad 1', description: 'Desc 1', image_url: 'http://img.com', target_url: 'http://target.com', status: 'approved' } });
  });

  it('should return 400 if publisher_id is missing', async () => {
    const req = new NextRequest('http://localhost/api/serve');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('should serve an ad and record an impression', async () => {
    const req = new NextRequest('http://localhost/api/serve?publisher_id=1', {
      headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '1.2.3.4' }
    });
    
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html');
    
    const html = await res.text();
    expect(html).toContain('Ad 1');
    expect(html).toContain('http://img.com');
    // React's automatic escaping changes '&' to '&amp;'
    expect(html).toContain('/api/click?ad_id=1&amp;publisher_id=1');

    // Verify impression
    const imp = await prisma.impression.findFirst({ where: { ad_id: 1, publisher_id: 1 } });
    expect(imp).toBeDefined();
    expect(imp?.ip_address).toBe('1.2.3.4');
  });

  it('should return 204 if no matching ad is found', async () => {
    await prisma.ad.update({ where: { id: 1 }, data: { status: 'pending' } });
    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });

  it('should respect device targeting (mobile)', async () => {
    await prisma.adGroup.update({ where: { id: 1 }, data: { target_device: 'mobile' } });

    // Request from Desktop
    const reqDesktop = new NextRequest('http://localhost/api/serve?publisher_id=1', {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const resDesktop = await GET(reqDesktop);
    expect(resDesktop.status).toBe(204);

    // Request from Mobile
    const reqMobile = new NextRequest('http://localhost/api/serve?publisher_id=1', {
      headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' }
    });
    const resMobile = await GET(reqMobile);
    expect(resMobile.status).toBe(200);
  });

  it('should not serve an ad if the campaign has not started yet', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    await prisma.campaign.update({ where: { id: 1 }, data: { start_date: future } });

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });

  it('should not serve an ad if the campaign has already ended', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    await prisma.campaign.update({ where: { id: 1 }, data: { end_date: past } });

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });

  it('should respect ad group schedules', async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    // 現在時刻を含まないスケジュールを設定
    await prisma.adSchedule.create({
      data: {
        ad_group_id: 1,
        day_of_week: (dayOfWeek + 1) % 7,
        start_hour: 0,
        end_hour: 23
      }
    });

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);

    // 現在時刻を含むスケジュールを追加
    await prisma.adSchedule.create({
      data: {
        ad_group_id: 1,
        day_of_week: dayOfWeek,
        start_hour: 0,
        end_hour: 23
      }
    });

    const resOk = await GET(req);
    expect(resOk.status).toBe(200);
  });

  it('should respect specific publisher targeting', async () => {
    await prisma.publisher.create({ data: { id: 99, name: 'Pub 99', domain: 'p99.com' } });
    await prisma.adGroup.update({ where: { id: 1 }, data: { is_all_publishers: 0 } });
    await prisma.adGroupTargetPublisher.create({
      data: { ad_group_id: 1, publisher_id: 99 }
    });

    // 許可されていないパブリッシャーからのリクエスト
    const reqFail = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const resFail = await GET(reqFail);
    expect(resFail.status).toBe(204);

    // ターゲットのパブリッシャーからのリクエスト
    const reqOk = new NextRequest('http://localhost/api/serve?publisher_id=99');
    const resOk = await GET(reqOk);
    expect(resOk.status).toBe(200);
  });

  it('should escape ad title and description to prevent XSS', async () => {
    await prisma.ad.update({ 
      where: { id: 1 }, 
      data: { title: '<script>alert(1)</script>', description: '" onclick="alert(2)' } 
    });

    const req = new NextRequest('http://localhost/api/serve?publisher_id=1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    
    const html = await res.text();
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&quot; onclick=&quot;alert(2)');
  });

  describe('Category Matching', () => {
    beforeEach(async () => {
      // Publisher 2 (Anime) and Publisher 3 (Tech)
      await prisma.publisher.create({ data: { id: 2, name: 'Pub Anime', domain: 'anime.com', category: 'anime' } });
      await prisma.publisher.create({ data: { id: 3, name: 'Pub Tech', domain: 'tech.com', category: 'tech' } });
    });

    it('should serve an ad when categories match (Anime)', async () => {
      await prisma.adGroup.update({ where: { id: 1 }, data: { target_category: 'anime' } });

      const req = new NextRequest('http://localhost/api/serve?publisher_id=2');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should NOT serve an ad when categories mismatch (Anime vs Tech)', async () => {
      await prisma.adGroup.update({ where: { id: 1 }, data: { target_category: 'anime' } });

      const req = new NextRequest('http://localhost/api/serve?publisher_id=3');
      const res = await GET(req);
      expect(res.status).toBe(204);
    });

    it('should serve an ad when target_category is NULL (broad matching)', async () => {
      await prisma.adGroup.update({ where: { id: 1 }, data: { target_category: null } });

      // Request from Tech publisher
      const req = new NextRequest('http://localhost/api/serve?publisher_id=3');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should serve an ad when target_category is empty string (broad matching)', async () => {
      await prisma.adGroup.update({ where: { id: 1 }, data: { target_category: '' } });

      const req = new NextRequest('http://localhost/api/serve?publisher_id=2');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });
});
