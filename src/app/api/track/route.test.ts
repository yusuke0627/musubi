import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { POST } from './route';
import { GET as clickGET } from '../click/route';
import { clearDatabase } from '@/lib/test-utils';

describe('Conversion Tracking API', () => {
  beforeEach(async () => {
    await clearDatabase();

    // Setup mock data
    await prisma.advertiser.create({ data: { id: 1, name: 'Adv 1', balance: 1000 } });
    await prisma.publisher.create({ data: { id: 1, name: 'Pub 1', domain: 'p1.com' } });
    await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Camp 1', budget: 1000, spent: 0 } });
    await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Group 1', max_bid: 100 } });
    await prisma.ad.create({ 
      data: { 
        id: 1, 
        ad_group_id: 1, 
        title: 'Ad 1', 
        target_url: 'http://advertiser.com/landing', 
        status: 'approved' 
      } 
    });

    // Setup Conversion Rules
    await prisma.conversionRule.create({
      data: {
        id: 1,
        advertiser_id: 1,
        url_pattern: '/purchase',
        name: 'Purchase Completed',
        label: 'macro',
        revenue: 1500
      }
    });
    await prisma.conversionRule.create({
      data: {
        id: 2,
        advertiser_id: 1,
        url_pattern: '/cart',
        name: 'Add to Cart',
        label: 'micro',
        revenue: 0
      }
    });
  });

  it('should append click_id to redirect URL', async () => {
    const req = new NextRequest('http://localhost/api/click?ad_id=1&publisher_id=1');
    const res = await clickGET(req);
    
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('click_id=');
    
    // Verify click record
    const click = await prisma.click.findFirst();
    expect(click?.click_id).toBeDefined();
    expect(location).toContain(click?.click_id);
  });

  it('should record a conversion when URL matches a rule', async () => {
    // 1. Simulate a click to get a valid click_id
    const click = await prisma.click.create({
      data: {
        click_id: 'test-uuid-123',
        ad_id: 1,
        publisher_id: 1,
        campaign_id: 1,
        cost: 100
      }
    });

    // 2. Track a pageview that matches the 'purchase' rule
    const req = new NextRequest('http://localhost/api/track', {
      method: 'POST',
      body: JSON.stringify({
        click_id: 'test-uuid-123',
        url: 'http://advertiser.com/products/1/purchase'
      })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.matched).toBe(1);
    expect(data.conversions).toBe(1);

    // 3. Verify Conversion record
    const cv = await prisma.conversion.findFirst({
      where: { click_id: 'test-uuid-123', rule_id: 1 }
    });
    expect(cv).toBeDefined();
    expect(cv?.revenue).toBe(1500);
  });

  it('should not record duplicate conversions for the same click and rule', async () => {
    await prisma.click.create({
      data: { click_id: 'dup-click', ad_id: 1, publisher_id: 1 }
    });

    const body = JSON.stringify({
      click_id: 'dup-click',
      url: 'http://advertiser.com/purchase'
    });

    // First tracking call
    await POST(new NextRequest('http://localhost/api/track', { method: 'POST', body }));
    
    // Second tracking call (same URL)
    const res = await POST(new NextRequest('http://localhost/api/track', { method: 'POST', body }));
    const data = await res.json();
    
    expect(data.matched).toBe(1);
    expect(data.conversions).toBe(0); // Already exists
    
    const count = await prisma.conversion.count({ where: { click_id: 'dup-click' } });
    expect(count).toBe(1);
  });

  it('should handle multiple matching rules', async () => {
    await prisma.click.create({
      data: { click_id: 'multi-click', ad_id: 1, publisher_id: 1 }
    });

    // Add a rule that also matches
    await prisma.conversionRule.create({
      data: {
        advertiser_id: 1,
        url_pattern: 'advertiser.com', // matches everything on this domain
        name: 'Any Pageview',
        label: 'micro'
      }
    });

    const req = new NextRequest('http://localhost/api/track', {
      method: 'POST',
      body: JSON.stringify({
        click_id: 'multi-click',
        url: 'http://advertiser.com/purchase'
      })
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.matched).toBe(2); // '/purchase' and 'advertiser.com'
    expect(data.conversions).toBe(2);
  });

  it('should return 404 for invalid click_id', async () => {
    const req = new NextRequest('http://localhost/api/track', {
      method: 'POST',
      body: JSON.stringify({
        click_id: 'invalid-id',
        url: 'http://any.com'
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
