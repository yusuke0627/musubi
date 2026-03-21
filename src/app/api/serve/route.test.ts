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
    await prisma.publisher.create({ data: { id: 1, name: 'Pub 1', category: 'tech' } });
    await prisma.app.create({ data: { id: 1, publisher_id: 1, name: 'App 1', domain: 'app1.com', platform: 'web' } });
    await prisma.adUnit.create({ data: { id: 1, app_id: 1, name: 'Unit 1', width: 300, height: 250 } });

    await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Camp 1', budget: 1000, spent: 0 } });
    await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Group 1', max_bid: 100, target_device: 'all', is_all_publishers: 1 } });
    await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'Ad 1', description: 'Desc 1', image_url: 'http://img.com', target_url: 'http://target.com', status: 'approved' } });
  });

  it('should return 400 if ad_unit_id is missing', async () => {
    const req = new NextRequest('http://localhost/api/serve');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('should return 404 if ad_unit_id does not exist', async () => {
    const req = new NextRequest('http://localhost/api/serve?ad_unit_id=999');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('should return ad HTML with a tracking pixel but NOT record impression immediately', async () => {
    const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
      headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '1.2.3.4' }
    });
    
    const res = await GET(req);
    expect(res.status).toBe(200);
    
    const html = await res.text();
    expect(html).toContain('Ad 1');
    // Verify tracking pixel is present
    expect(html).toContain('/api/impression?ad_id=1');
    expect(html).not.toContain('publisher_id='); // Should be hidden
    expect(html).toContain('ad_unit_id=1');

    // Verify impression is NOT recorded yet
    const impCount = await prisma.impression.count();
    expect(impCount).toBe(0);
  });

  it('should record an impression when the tracking pixel is requested', async () => {
    const { GET: pixelGET } = await import('../impression/route');
    const pixelReq = new NextRequest('http://localhost/api/impression?ad_id=1&ad_unit_id=1', {
      headers: { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '5.6.7.8' }
    });

    const res = await pixelGET(pixelReq);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/gif');

    // Verify impression record
    const imp = await prisma.impression.findFirst({ where: { ad_id: 1, ad_unit_id: 1 } });
    expect(imp).toBeDefined();
    expect(imp?.publisher_id).toBe(1);
    expect(imp?.ip_address).toBe('5.6.7.8');
  });

  it('should return 204 if no matching ad is found', async () => {
    await prisma.ad.update({ where: { id: 1 }, data: { status: 'pending' } });
    const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });

  it('should respect device targeting (mobile)', async () => {
    await prisma.adGroup.update({ where: { id: 1 }, data: { target_device: 'mobile' } });

    // Request from Desktop
    const reqDesktop = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const resDesktop = await GET(reqDesktop);
    expect(resDesktop.status).toBe(204);

    // Request from Mobile
    const reqMobile = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
      headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' }
    });
    const resMobile = await GET(reqMobile);
    expect(resMobile.status).toBe(200);
  });

  describe('Category Matching', () => {
    beforeEach(async () => {
      // Anime Publisher, App, and Unit
      await prisma.publisher.create({ data: { id: 2, name: 'Pub Anime', category: 'anime' } });
      await prisma.app.create({ data: { id: 2, publisher_id: 2, name: 'Anime App', platform: 'ios' } });
      await prisma.adUnit.create({ data: { id: 2, app_id: 2, name: 'Anime Unit' } });
    });

    it('should serve an ad when categories match (Anime)', async () => {
      await prisma.adGroup.update({ where: { id: 1 }, data: { target_category: 'anime' } });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=2');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should NOT serve an ad when categories mismatch (Anime vs Tech)', async () => {
      await prisma.adGroup.update({ where: { id: 1 }, data: { target_category: 'anime' } });

      // Unit 1 is Tech (Publisher 1)
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
      const res = await GET(req);
      expect(res.status).toBe(204);
    });
  });

  describe('OS Targeting', () => {
    it('should serve an ad when targeting matches iOS', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ os: ['iOS'] }) } 
      });

      // Request from iOS
      const reqiOS = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' }
      });
      const resiOS = await GET(reqiOS);
      expect(resiOS.status).toBe(200);

      // Request from Android
      const reqAndroid = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F)' }
      });
      const resAndroid = await GET(reqAndroid);
      expect(resAndroid.status).toBe(204);
    });

    it('should serve an ad when targeting matches Android', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ os: ['Android'] }) } 
      });

      // Request from Android
      const reqAndroid = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F)' }
      });
      const resAndroid = await GET(reqAndroid);
      expect(resAndroid.status).toBe(200);

      // Request from iOS
      const reqiOS = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' }
      });
      const resiOS = await GET(reqiOS);
      expect(resiOS.status).toBe(204);
    });

    it('should serve an ad when targeting multiple OS (iOS and Android)', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ os: ['iOS', 'Android'] }) } 
      });

      // Request from iOS
      const resiOS = await GET(new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' }
      }));
      expect(resiOS.status).toBe(200);

      // Request from Android
      const resAndroid = await GET(new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F)' }
      }));
      expect(resAndroid.status).toBe(200);

      // Request from Windows (Other)
      const resWindows = await GET(new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }));
      expect(resWindows.status).toBe(204);
    });

    it('should serve an ad to any OS when targeting is not set', async () => {
      await prisma.adGroup.update({ where: { id: 1 }, data: { targeting: null } });

      const resiOS = await GET(new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' }
      }));
      expect(resiOS.status).toBe(200);

      const resAndroid = await GET(new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F)' }
      }));
      expect(resAndroid.status).toBe(200);
    });
  });
});
