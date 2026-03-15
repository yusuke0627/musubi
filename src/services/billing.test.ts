import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../lib/db';
import { runBillingWorker } from './billing';
import { clearDatabase } from '../lib/test-utils';

describe('Billing Service', () => {
  beforeEach(async () => {
    await clearDatabase();

    // Setup initial data
    await prisma.advertiser.create({
      data: { id: 1, name: 'Adv 1', balance: 1000 }
    });
    await prisma.publisher.create({
      data: { id: 1, name: 'Pub 1', domain: 'p1.com', rev_share: 0.7 }
    });
    await prisma.campaign.create({
      data: { id: 1, advertiser_id: 1, name: 'Camp 1' }
    });
    await prisma.adGroup.create({
      data: { id: 1, campaign_id: 1, name: 'Group 1', max_bid: 100 }
    });
    await prisma.ad.create({
      data: { id: 1, ad_group_id: 1, title: 'Ad 1', target_url: 'http://t.com', status: 'approved' }
    });
  });

  it('should process a valid pending click and update balances', async () => {
    await prisma.click.create({
      data: { ad_id: 1, publisher_id: 1, ip_address: '1.1.1.1', processed: 0 }
    });

    const processed = await runBillingWorker();
    expect(processed).toBe(1);

    const adv = await prisma.advertiser.findUnique({ where: { id: 1 } });
    expect(adv?.balance).toBe(900); // 1000 - 100

    const pub = await prisma.publisher.findUnique({ where: { id: 1 } });
    expect(pub?.balance).toBe(70); // 100 * 0.7
    expect(pub?.total_earnings).toBe(70);

    const click = await prisma.click.findFirst();
    expect(click?.is_valid).toBe(1);
    expect(click?.processed).toBe(1);
  });

  it('should invalidate click if advertiser has insufficient balance', async () => {
    await prisma.advertiser.update({
      where: { id: 1 },
      data: { balance: 50 }
    });

    await prisma.click.create({
      data: { ad_id: 1, publisher_id: 1, ip_address: '1.1.1.1', processed: 0 }
    });

    const processed = await runBillingWorker();
    expect(processed).toBe(1);

    const adv = await prisma.advertiser.findUnique({ where: { id: 1 } });
    expect(adv?.balance).toBe(50); // No change

    const click = await prisma.click.findFirst();
    expect(click?.is_valid).toBe(0);
    expect(click?.invalid_reason).toBe('Insufficient advertiser balance');
  });

  it('should invalidate click if daily budget is exceeded', async () => {
    // Set daily budget very low
    await prisma.campaign.update({
      where: { id: 1 },
      data: { daily_budget: 50 } // Max bid is 100
    });

    await prisma.click.create({
      data: { ad_id: 1, publisher_id: 1, ip_address: '1.1.1.1', processed: 0 }
    });

    const processed = await runBillingWorker();
    expect(processed).toBe(1);

    const click = await prisma.click.findFirst();
    expect(click?.is_valid).toBe(0);
    expect(click?.invalid_reason).toBe('Daily budget exceeded');
  });
});
