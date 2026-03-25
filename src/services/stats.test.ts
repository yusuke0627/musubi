import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '@/lib/db';
import { getDailyStats, getPlacementStats } from './stats';
import { clearDatabase } from '@/lib/test-utils';

describe('getDailyStats', () => {
  beforeEach(async () => {
    await clearDatabase();

    // Setup initial data
    await prisma.advertiser.create({ data: { id: 1, name: 'Test Adv' } });
    await prisma.publisher.create({ data: { id: 1, name: 'Test Pub' } });
    await prisma.app.create({ data: { id: 1, publisher_id: 1, name: 'App 1', domain: 'app1.com' } });
    await prisma.adUnit.create({ data: { id: 1, app_id: 1, name: 'Unit 1' } });

    await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Test Camp' } });
    await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Test Group' } });
    await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'Test Ad', target_url: 'http://test.com', review_status: 'approved', status: 'ACTIVE' } });
  });

  it('should aggregate impressions and clicks by date', async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    await prisma.impression.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1, created_at: today } });
    await prisma.impression.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1, created_at: today } });
    
    await prisma.click.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1, is_valid: 1, created_at: today } });
    await prisma.click.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1, is_valid: 0, created_at: today } });

    const stats = await getDailyStats({ advertiserId: '1' }) as any[];
    const dayStats = stats.find(s => s.date === dateStr);
    
    expect(dayStats).toBeDefined();
    expect(dayStats?.impressions).toBe(2);
    expect(dayStats?.clicks).toBe(1);
  });
});

describe('getPlacementStats', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should return placement statistics for an advertiser', async () => {
    await prisma.advertiser.create({ data: { id: 1, name: 'Adv 1' } });
    await prisma.advertiser.create({ data: { id: 2, name: 'Adv 2' } });
    
    await prisma.publisher.create({ data: { id: 1, name: 'Pub 1' } });
    await prisma.app.create({ data: { id: 1, publisher_id: 1, name: 'App 1', domain: 'p1.com' } });
    await prisma.adUnit.create({ data: { id: 1, app_id: 1, name: 'Unit 1' } });

    await prisma.publisher.create({ data: { id: 2, name: 'Pub 2' } });
    await prisma.app.create({ data: { id: 2, publisher_id: 2, name: 'App 2', domain: 'p2.com' } });
    await prisma.adUnit.create({ data: { id: 2, app_id: 2, name: 'Unit 2' } });
    
    await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Camp 1' } });
    await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Group 1' } });
    await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'Ad 1', target_url: 'http://a1.com', review_status: 'approved', status: 'ACTIVE' } });

    await prisma.impression.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1 } });
    await prisma.impression.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1 } });
    await prisma.impression.create({ data: { ad_id: 1, publisher_id: 2, ad_unit_id: 2 } });
    await prisma.click.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1, is_valid: 1, processed: 1 } });

    const stats = await getPlacementStats('1') as any[];
    
    expect(stats.length).toBeGreaterThanOrEqual(2);
    
    const pub1 = stats.find(s => s.id === 1);
    expect(pub1?.impressions).toBe(2);
    expect(pub1?.clicks).toBe(1);
    
    const pub2 = stats.find(s => s.id === 2);
    expect(pub2?.impressions).toBe(1);
    expect(pub2?.clicks).toBe(0);

    const statsForAdv2 = await getPlacementStats('2') as any[];
    expect(statsForAdv2).toHaveLength(0);
  });
});
