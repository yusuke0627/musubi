import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../lib/db';
import { isBotUserAgent, isRateLimited, isDuplicate, isTooFastClick } from './ivt';
import { clearDatabase } from '../lib/test-utils';

describe('IVT Service (Invalid Traffic Detection)', () => {
  describe('isBotUserAgent', () => {
    it('should detect common bot user agents', () => {
      expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
      expect(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
      expect(isBotUserAgent('curl/7.68.0')).toBe(true);
      expect(isBotUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4515.107 Safari/537.36')).toBe(true);
      expect(isBotUserAgent('PostmanRuntime/7.28.4')).toBe(true);
    });

    it('should pass normal user agents', () => {
      expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')).toBe(false);
      expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1')).toBe(false);
      expect(isBotUserAgent(null)).toBe(false);
      expect(isBotUserAgent(undefined)).toBe(false);
      expect(isBotUserAgent('')).toBe(false);
    });
  });

  describe('Database checks', () => {
    let advertiser: any;
    let publisher: any;
    let campaign: any;
    let adGroup: any;
    let ad1: any;
    let ad2: any;

    beforeEach(async () => {
      await clearDatabase();
      
      // Setup some basic dependent data
      advertiser = await prisma.advertiser.create({ data: { name: 'Adv' } });
      publisher = await prisma.publisher.create({ data: { name: 'Pub' } });
      campaign = await prisma.campaign.create({ data: { advertiser_id: advertiser.id, name: 'Camp' } });
      adGroup = await prisma.adGroup.create({ data: { campaign_id: campaign.id, name: 'Group' } });
      ad1 = await prisma.ad.create({ data: { ad_group_id: adGroup.id, title: 'Ad 1', target_url: 'http://example.com' } });
      ad2 = await prisma.ad.create({ data: { ad_group_id: adGroup.id, title: 'Ad 2', target_url: 'http://example2.com' } });
    });

    describe('isDuplicate', () => {
      it('should detect a duplicate click within 10 seconds', async () => {
        // Insert an initial valid click
        await prisma.click.create({
          data: {
            ad_id: ad1.id,
            publisher_id: publisher.id,
            ip_address: '192.168.1.1',
            is_valid: 1,
            created_at: new Date('2026-03-12T10:00:00Z')
          }
        });

        // Check a new click occurring 5 seconds later
        const isDup = await isDuplicate(prisma, ad1.id, '192.168.1.1', 9999, new Date('2026-03-12T10:00:05Z'));
        expect(isDup).toBe(true);
      });

      it('should not detect duplicate if more than 10 seconds have passed', async () => {
        await prisma.click.create({
          data: {
            ad_id: ad1.id,
            publisher_id: publisher.id,
            ip_address: '192.168.1.1',
            is_valid: 1,
            created_at: new Date('2026-03-12T10:00:00Z')
          }
        });

        const isDup = await isDuplicate(prisma, ad1.id, '192.168.1.1', 9999, new Date('2026-03-12T10:00:11Z'));
        expect(isDup).toBe(false);
      });

      it('should not detect duplicate for different ad', async () => {
        await prisma.click.create({
          data: {
            ad_id: ad1.id,
            publisher_id: publisher.id,
            ip_address: '192.168.1.1',
            is_valid: 1,
            created_at: new Date('2026-03-12T10:00:00Z')
          }
        });

        // Check for ad_id 2
        const isDup = await isDuplicate(prisma, ad2.id, '192.168.1.1', 9999, new Date('2026-03-12T10:00:05Z'));
        expect(isDup).toBe(false);
      });
    });

    describe('isRateLimited', () => {
      it('should flag as rate limited if IP has >= 50 clicks in the last hour', async () => {
        for (let i = 0; i < 50; i++) {
          await prisma.click.create({
            data: {
              ad_id: ad1.id,
              publisher_id: publisher.id,
              ip_address: '10.0.0.1',
              is_valid: 1,
              created_at: new Date('2026-03-12T10:30:00Z')
            }
          });
        }

        const isLimited = await isRateLimited(prisma, '10.0.0.1', 9999, new Date('2026-03-12T10:59:59Z'));
        expect(isLimited).toBe(true);
      });

      it('should not flag if IP has < 50 clicks in the last hour', async () => {
        for (let i = 0; i < 49; i++) {
          await prisma.click.create({
            data: {
              ad_id: ad1.id,
              publisher_id: publisher.id,
              ip_address: '10.0.0.1',
              is_valid: 1,
              created_at: new Date('2026-03-12T10:30:00Z')
            }
          });
        }

        const isLimited = await isRateLimited(prisma, '10.0.0.1', 9999, new Date('2026-03-12T10:59:59Z'));
        expect(isLimited).toBe(false);
      });
      
      it('should not count clicks older than 1 hour', async () => {
        for (let i = 0; i < 50; i++) {
          await prisma.click.create({
            data: {
              ad_id: ad1.id,
              publisher_id: publisher.id,
              ip_address: '10.0.0.1',
              is_valid: 1,
              created_at: new Date('2026-03-11T10:00:00Z')
            }
          });
        }

        const isLimited = await isRateLimited(prisma, '10.0.0.1', 9999, new Date('2026-03-12T10:00:00Z'));
        expect(isLimited).toBe(false);
      });
    });

    describe('isTooFastClick', () => {
      beforeEach(async () => {
        // Setup impression
        await prisma.impression.create({
          data: {
            ad_id: ad1.id,
            publisher_id: publisher.id,
            imp_id: 'imp_123',
            created_at: new Date('2026-03-12T10:00:00.000Z')
          }
        });
      });

      it('should flag click as too fast if it occurs within 1 second (e.g., 500ms)', async () => {
        const click = {
          imp_id: 'imp_123',
          created_at: new Date('2026-03-12T10:00:00.500Z')
        };
        const isFast = await isTooFastClick(prisma, click);
        expect(isFast).toBe(true);
      });

      it('should NOT flag click as too fast if it occurs after 1 second (e.g., 1500ms)', async () => {
        const click = {
          imp_id: 'imp_123',
          created_at: new Date('2026-03-12T10:00:01.500Z')
        };
        const isFast = await isTooFastClick(prisma, click);
        expect(isFast).toBe(false);
      });

      it('should flag as invalid if impression ID is missing in click', async () => {
        const click = {
          imp_id: null,
          created_at: new Date('2026-03-12T10:00:01.500Z')
        };
        const isFast = await isTooFastClick(prisma, click);
        expect(isFast).toBe(true);
      });

      it('should flag as invalid if linked impression is not found', async () => {
        const click = {
          imp_id: 'non_existent_imp',
          created_at: new Date('2026-03-12T10:00:01.500Z')
        };
        const isFast = await isTooFastClick(prisma, click);
        expect(isFast).toBe(true);
      });
    });
  });
});
