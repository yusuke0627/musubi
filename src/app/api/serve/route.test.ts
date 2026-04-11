import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'Ad 1', description: 'Desc 1', image_path: '/uploads/ads/test.jpg', target_url: 'http://target.com', review_status: 'approved', status: 'ACTIVE' } });
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
    await prisma.ad.update({ where: { id: 1 }, data: { review_status: 'pending' } });
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

  describe('Schedule Targeting', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should serve an ad when schedule matches current day and hour', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00')); // Monday 10:00

      await prisma.adGroup.update({
        where: { id: 1 },
        data: { targeting: JSON.stringify({ schedule: { mon: [9, 10, 11] } }) }
      });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should return 204 when schedule day mismatches', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-16T10:00:00')); // Tuesday 10:00

      await prisma.adGroup.update({
        where: { id: 1 },
        data: { targeting: JSON.stringify({ schedule: { mon: [9, 10, 11] } }) }
      });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
      const res = await GET(req);
      expect(res.status).toBe(204);
    });

    it('should return 204 when schedule hour mismatches', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T14:00:00')); // Monday 14:00

      await prisma.adGroup.update({
        where: { id: 1 },
        data: { targeting: JSON.stringify({ schedule: { mon: [9, 10, 11] } }) }
      });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
      const res = await GET(req);
      expect(res.status).toBe(204);
    });

    it('should serve an ad when schedule is not set', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00')); // Monday 10:00

      await prisma.adGroup.update({
        where: { id: 1 },
        data: { targeting: JSON.stringify({ os: ['iOS'] }) }
      });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe('Scoring & Smoothing', () => {
    it('should serve a new ad (0 imps, 0 clicks) using smoothing score', async () => {
      // Clear impressions and clicks to ensure 0/0
      await prisma.impression.deleteMany();
      await prisma.click.deleteMany();

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
      const res = await GET(req);
      
      // Should be served because score = 100 * (0+1)/(0+100) = 1.0
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should serve the ad with higher smoothed score', async () => {
      // Add a second ad group and ad with higher bid
      await prisma.adGroup.create({ data: { id: 2, campaign_id: 1, name: 'Group 2', max_bid: 200, target_device: 'all', is_all_publishers: 1 } });
      await prisma.ad.create({ data: { id: 2, ad_group_id: 2, title: 'Ad 2', target_url: 'http://target2.com', review_status: 'approved', status: 'ACTIVE' } });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
      const res = await GET(req);
      const html = await res.text();
      
      // Ad 2 should win (Bid 200 > Bid 100 with same 0/0 stats)
      expect(html).toContain('Ad 2');
      expect(html).not.toContain('Ad 1');
    });
  });

  describe('Language Targeting', () => {
    it('should serve an ad when language matches (Japanese)', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ languages: ["ja"] }) } 
      });

      // Request with Japanese language preference
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'accept-language': 'ja-JP,ja;q=0.9,en-US;q=0.8' }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should NOT serve an ad when language does not match', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ languages: ["fr"] }) } // French only
      });

      // Request with Japanese language preference
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'accept-language': 'ja-JP,ja;q=0.9,en-US;q=0.8' }
      });
      const res = await GET(req);
      expect(res.status).toBe(204);
    });

    it('should serve an ad when targeting multiple languages', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ languages: ["ja", "en"] }) } 
      });

      // Request with English language preference
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'accept-language': 'en-US,en;q=0.9' }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('should serve an ad to any language when targeting is not set', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ os: ['iOS'] }) } // No language targeting
      });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'accept-language': 'de-DE,de;q=0.9' // German
        }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('should serve an ad when Accept-Language header is missing', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ languages: ["ja"] }) } 
      });

      // No Accept-Language header
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1');
      const res = await GET(req);
      expect(res.status).toBe(204); // No match because languages array is empty
    });
  });

  describe('Geo Targeting (Prefecture)', () => {
    it('should serve an ad when prefecture matches (Tokyo)', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ geo: ["東京都"] }) } 
      });

      // Request from Tokyo IP (AWS Tokyo region)
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'x-forwarded-for': '54.64.1.1' }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should NOT serve an ad when prefecture does not match', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ geo: ["北海道"] }) } // Hokkaido only
      });

      // Request from Tokyo IP
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'x-forwarded-for': '54.64.1.1' }
      });
      const res = await GET(req);
      expect(res.status).toBe(204);
    });

    it('should serve an ad when targeting multiple prefectures', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ geo: ["東京都", "大阪府"] }) } 
      });

      // Request from Osaka IP
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'x-forwarded-for': '13.208.1.1' }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('should serve an ad to any prefecture when geo targeting is not set', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ os: ['iOS'] }) } // No geo targeting
      });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'x-forwarded-for': '54.64.1.1'
        }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('should handle private IP addresses (no prefecture detection)', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ geo: ["東京都"] }) } 
      });

      // Private IP (cannot determine prefecture)
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      const res = await GET(req);
      expect(res.status).toBe(204); // No match because prefecture is undefined
    });

    it('should handle unknown IP addresses (no prefecture detection)', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ geo: ["東京都"] }) } 
      });

      // Unknown IP (not in our mapping)
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 'x-forwarded-for': '1.2.3.4' }
      });
      const res = await GET(req);
      expect(res.status).toBe(204);
    });
  });

  describe('Combined Targeting (OS + Language + Geo)', () => {
    it('should serve an ad when all targeting criteria match', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ 
          os: ['iOS'], 
          languages: ['ja'], 
          geo: ['東京都'] 
        }) } 
      });

      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'accept-language': 'ja-JP,ja;q=0.9',
          'x-forwarded-for': '54.64.1.1' // Tokyo
        }
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Ad 1');
    });

    it('should NOT serve an ad when one targeting criterion does not match', async () => {
      await prisma.adGroup.update({ 
        where: { id: 1 }, 
        data: { targeting: JSON.stringify({ 
          os: ['iOS'], 
          languages: ['ja'], 
          geo: ['東京都'] 
        }) } 
      });

      // OS matches, language matches, but geo does not (Osaka IP)
      const req = new NextRequest('http://localhost/api/serve?ad_unit_id=1', {
        headers: { 
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          'accept-language': 'ja-JP,ja;q=0.9',
          'x-forwarded-for': '13.208.1.1' // Osaka
        }
      });
      const res = await GET(req);
      expect(res.status).toBe(204);
    });
  });
});
