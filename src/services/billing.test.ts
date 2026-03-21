import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../lib/db';
import { runBillingWorker } from './billing';
import { clearDatabase } from '../lib/test-utils';

describe('Billing Service', () => {
  let adv1: any;
  let pub1: any;
  let camp1: any;
  let group1: any;
  let ad1: any;

  beforeEach(async () => {
    await clearDatabase();

    // Setup initial data
    adv1 = await prisma.advertiser.create({
      data: { name: 'Adv 1', balance: 1000 }
    });
    pub1 = await prisma.publisher.create({
      data: { name: 'Pub 1', rev_share: 0.7 }
    });
    camp1 = await prisma.campaign.create({
      data: { advertiser_id: adv1.id, name: 'Camp 1' }
    });
    group1 = await prisma.adGroup.create({
      data: { campaign_id: camp1.id, name: 'Group 1', max_bid: 100 }
    });
    ad1 = await prisma.ad.create({
      data: { ad_group_id: group1.id, title: 'Ad 1', target_url: 'http://t.com', status: 'approved' }
    });
  });

  it('should process a valid pending click and update balances', async () => {
    const impId = 'imp_valid';
    // Create an impression first (required for isTooFastClick)
    await prisma.impression.create({
      data: {
        ad_id: ad1.id,
        publisher_id: pub1.id,
        imp_id: impId,
        created_at: new Date(Date.now() - 5000) // 5 seconds ago
      }
    });

    await prisma.click.create({
      data: { 
        ad_id: ad1.id, 
        publisher_id: pub1.id, 
        imp_id: impId,
        ip_address: '1.1.1.1', 
        processed: 0 
      }
    });

    const processed = await runBillingWorker();
    expect(processed).toBe(1);

    const adv = await prisma.advertiser.findUnique({ where: { id: adv1.id } });
    expect(adv?.balance).toBe(900); // 1000 - 100

    const pub = await prisma.publisher.findUnique({ where: { id: pub1.id } });
    expect(pub?.balance).toBe(70); // 100 * 0.7
    expect(pub?.total_earnings).toBe(70);

    const click = await prisma.click.findFirst();
    expect(click?.is_valid).toBe(1);
    expect(click?.processed).toBe(1);
  });

  it('should invalidate click if advertiser has insufficient balance', async () => {
    const impId = 'imp_nobalance';
    await prisma.impression.create({
      data: {
        ad_id: ad1.id,
        publisher_id: pub1.id,
        imp_id: impId,
        created_at: new Date(Date.now() - 5000)
      }
    });

    await prisma.advertiser.update({
      where: { id: adv1.id },
      data: { balance: 50 }
    });

    await prisma.click.create({
      data: { 
        ad_id: ad1.id, 
        publisher_id: pub1.id, 
        imp_id: impId,
        ip_address: '1.1.1.1', 
        processed: 0 
      }
    });

    const processed = await runBillingWorker();
    expect(processed).toBe(1);

    const adv = await prisma.advertiser.findUnique({ where: { id: adv1.id } });
    expect(adv?.balance).toBe(50); // No change

    const click = await prisma.click.findFirst();
    expect(click?.is_valid).toBe(0);
    expect(click?.invalid_reason).toBe('Insufficient advertiser balance');
  });

  it('should invalidate click if daily budget is exceeded', async () => {
    const impId = 'imp_budget';
    await prisma.impression.create({
      data: {
        ad_id: ad1.id,
        publisher_id: pub1.id,
        imp_id: impId,
        created_at: new Date(Date.now() - 5000)
      }
    });

    // Set daily budget very low
    await prisma.campaign.update({
      where: { id: camp1.id },
      data: { daily_budget: 50 } // Max bid is 100
    });

    await prisma.click.create({
      data: { 
        ad_id: ad1.id, 
        publisher_id: pub1.id, 
        imp_id: impId,
        ip_address: '1.1.1.1', 
        processed: 0 
      }
    });

    const processed = await runBillingWorker();
    expect(processed).toBe(1);

    const click = await prisma.click.findFirst();
    expect(click?.is_valid).toBe(0);
    expect(click?.invalid_reason).toBe('Daily budget exceeded');
  });

  it('should invalidate click if it occurred too fast after impression', async () => {
    const impId = 'imp_fast';
    await prisma.impression.create({
      data: {
        ad_id: ad1.id,
        publisher_id: pub1.id,
        imp_id: impId,
        created_at: new Date() // Just now
      }
    });

    await prisma.click.create({
      data: { 
        ad_id: ad1.id, 
        publisher_id: pub1.id, 
        imp_id: impId,
        ip_address: '1.1.1.1', 
        processed: 0 
      }
    });

    const processed = await runBillingWorker();
    expect(processed).toBe(1);

    const click = await prisma.click.findFirst();
    expect(click?.is_valid).toBe(0);
    expect(click?.invalid_reason).toBe('Too fast click');
  });
});
