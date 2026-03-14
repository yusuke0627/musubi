import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { GET } from './route';
import { clearDatabase } from '@/lib/test-utils';

describe('GET /api/click', () => {
  beforeEach(async () => {
    await clearDatabase();

    await prisma.advertiser.create({ data: { id: 1, name: 'Adv 1', balance: 1000 } });
    await prisma.publisher.create({ data: { id: 1, name: 'Pub 1', domain: 'p1.com' } });
    await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Camp 1' } });
    await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Group 1', max_bid: 100 } });
    await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'Ad 1', target_url: 'http://target.com', status: 'approved' } });
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
    
    // リダイレクトの検証
    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('http://target.com/');

    // DBにクリックが記録されているか確認
    const click = await prisma.click.findFirst({ where: { ad_id: 1 } });
    expect(click).toBeDefined();
    expect(click?.processed).toBe(0);
    expect(click?.ip_address).toBe('1.2.3.4');
  });

  it('should return 404 if ad is not found', async () => {
    const req = new NextRequest('http://localhost/api/click?ad_id=999');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
