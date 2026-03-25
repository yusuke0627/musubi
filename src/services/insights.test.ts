import { describe, it, expect, beforeEach } from 'vitest';
import { getAdminInsights, getAdvertiserInsights } from './insights';
import prisma from '../lib/db';
import { clearDatabase } from '../lib/test-utils';

describe('Insights Service', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('getAdminInsights', () => {
    it('should detect pending ads', async () => {
      // セットアップ: 審査待ち広告を作成
      const advertiser = await prisma.advertiser.create({ data: { id: 1, name: 'Test Advertiser' } });
      const campaign = await prisma.campaign.create({ 
        data: { id: 1, advertiser_id: advertiser.id, name: 'Campaign 1' } 
      });
      const adGroup = await prisma.adGroup.create({ 
        data: { id: 1, campaign_id: campaign.id, name: 'AdGroup 1' } 
      });
      await prisma.ad.create({
        data: { 
          id: 1, 
          ad_group_id: adGroup.id, 
          title: 'Pending Ad', 
          target_url: 'http://test.com',
          review_status: 'pending',
          status: 'ACTIVE'
        }
      });

      const insights = await getAdminInsights();
      
      const pendingAdInsight = insights.find(i => i.title === '審査待ちの広告');
      expect(pendingAdInsight).toBeDefined();
      expect(pendingAdInsight?.description).toContain('1件');
    });

    it('should not detect approved or rejected ads as pending', async () => {
      // セットアップ: 承認済みと却下済み広告を作成
      const advertiser = await prisma.advertiser.create({ data: { id: 1, name: 'Test Advertiser' } });
      const campaign = await prisma.campaign.create({ 
        data: { id: 1, advertiser_id: advertiser.id, name: 'Campaign 1' } 
      });
      const adGroup = await prisma.adGroup.create({ 
        data: { id: 1, campaign_id: campaign.id, name: 'AdGroup 1' } 
      });
      
      // approved
      await prisma.ad.create({
        data: { 
          id: 1, 
          ad_group_id: adGroup.id, 
          title: 'Approved Ad', 
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE'
        }
      });
      // rejected
      await prisma.ad.create({
        data: { 
          id: 2, 
          ad_group_id: adGroup.id, 
          title: 'Rejected Ad', 
          target_url: 'http://test.com',
          review_status: 'rejected',
          status: 'ACTIVE'
        }
      });

      const insights = await getAdminInsights();
      
      const pendingAdInsight = insights.find(i => i.title === '審査待ちの広告');
      expect(pendingAdInsight).toBeUndefined();
    });
  });

  describe('getAdvertiserInsights', () => {
    it('should detect rejected ads', async () => {
      const advertiser = await prisma.advertiser.create({ 
        data: { id: 1, name: 'Test Advertiser', balance: 10000 } 
      });
      const campaign = await prisma.campaign.create({ 
        data: { id: 1, advertiser_id: advertiser.id, name: 'Campaign 1' } 
      });
      const adGroup = await prisma.adGroup.create({ 
        data: { id: 1, campaign_id: campaign.id, name: 'AdGroup 1' } 
      });
      await prisma.ad.create({
        data: { 
          id: 1, 
          ad_group_id: adGroup.id, 
          title: 'Rejected Ad', 
          target_url: 'http://test.com',
          review_status: 'rejected',
          status: 'ACTIVE',
          rejection_reason: 'Policy violation'
        }
      });

      const insights = await getAdvertiserInsights(advertiser.id);
      
      const rejectedAdInsight = insights.find(i => i.title === '広告が却下されました');
      expect(rejectedAdInsight).toBeDefined();
      expect(rejectedAdInsight?.description).toContain('1件');
    });

    it('should not detect pending or approved ads as rejected', async () => {
      const advertiser = await prisma.advertiser.create({ 
        data: { id: 1, name: 'Test Advertiser', balance: 10000 } 
      });
      const campaign = await prisma.campaign.create({ 
        data: { id: 1, advertiser_id: advertiser.id, name: 'Campaign 1' } 
      });
      const adGroup = await prisma.adGroup.create({ 
        data: { id: 1, campaign_id: campaign.id, name: 'AdGroup 1' } 
      });
      
      // pending
      await prisma.ad.create({
        data: { 
          id: 1, 
          ad_group_id: adGroup.id, 
          title: 'Pending Ad', 
          target_url: 'http://test.com',
          review_status: 'pending',
          status: 'ACTIVE'
        }
      });
      // approved
      await prisma.ad.create({
        data: { 
          id: 2, 
          ad_group_id: adGroup.id, 
          title: 'Approved Ad', 
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE'
        }
      });

      const insights = await getAdvertiserInsights(advertiser.id);
      
      const rejectedAdInsight = insights.find(i => i.title === '広告が却下されました');
      expect(rejectedAdInsight).toBeUndefined();
    });

    it('should count only ads from the specified advertiser', async () => {
      // Advertiser 1
      const advertiser1 = await prisma.advertiser.create({ 
        data: { id: 1, name: 'Advertiser 1', balance: 10000 } 
      });
      const campaign1 = await prisma.campaign.create({ 
        data: { id: 1, advertiser_id: advertiser1.id, name: 'Campaign 1' } 
      });
      const adGroup1 = await prisma.adGroup.create({ 
        data: { id: 1, campaign_id: campaign1.id, name: 'AdGroup 1' } 
      });
      await prisma.ad.create({
        data: { 
          id: 1, 
          ad_group_id: adGroup1.id, 
          title: 'Rejected Ad 1', 
          target_url: 'http://test.com',
          review_status: 'rejected',
          status: 'ACTIVE'
        }
      });

      // Advertiser 2
      const advertiser2 = await prisma.advertiser.create({ 
        data: { id: 2, name: 'Advertiser 2', balance: 10000 } 
      });
      const campaign2 = await prisma.campaign.create({ 
        data: { id: 2, advertiser_id: advertiser2.id, name: 'Campaign 2' } 
      });
      const adGroup2 = await prisma.adGroup.create({ 
        data: { id: 2, campaign_id: campaign2.id, name: 'AdGroup 2' } 
      });
      await prisma.ad.create({
        data: { 
          id: 2, 
          ad_group_id: adGroup2.id, 
          title: 'Rejected Ad 2', 
          target_url: 'http://test.com',
          review_status: 'rejected',
          status: 'ACTIVE'
        }
      });

      // Advertiser 1のインサイトを取得
      const insights = await getAdvertiserInsights(advertiser1.id);
      
      const rejectedAdInsight = insights.find(i => i.title === '広告が却下されました');
      expect(rejectedAdInsight).toBeDefined();
      expect(rejectedAdInsight?.description).toContain('1件'); // Advertiser 1の1件のみ
    });

    it('should detect low balance', async () => {
      const advertiser = await prisma.advertiser.create({ 
        data: { id: 1, name: 'Test Advertiser', balance: 500 } 
      });

      const insights = await getAdvertiserInsights(advertiser.id);
      
      const lowBalanceInsight = insights.find(i => i.title === '残高不足アラート');
      expect(lowBalanceInsight).toBeDefined();
    });

    it('should detect low CTR ads', async () => {
      const publisher = await prisma.publisher.create({
        data: { id: 1, name: 'Test Publisher' }
      });
      const advertiser = await prisma.advertiser.create({ 
        data: { id: 1, name: 'Test Advertiser', balance: 10000 } 
      });
      const campaign = await prisma.campaign.create({ 
        data: { id: 1, advertiser_id: advertiser.id, name: 'Campaign 1' } 
      });
      const adGroup = await prisma.adGroup.create({ 
        data: { id: 1, campaign_id: campaign.id, name: 'AdGroup 1' } 
      });
      const ad = await prisma.ad.create({
        data: { 
          id: 1, 
          ad_group_id: adGroup.id, 
          title: 'Low CTR Ad', 
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE'
        }
      });

      // 100インプレッション、0クリック（CTR = 0%）
      for (let i = 0; i < 100; i++) {
        await prisma.impression.create({
          data: {
            ad_id: ad.id,
            publisher_id: publisher.id,
            imp_id: `imp-${i}`,
            created_at: new Date()
          }
        });
      }

      const insights = await getAdvertiserInsights(advertiser.id);
      
      const lowCtrInsight = insights.find(i => i.title === '広告のパフォーマンス低下');
      expect(lowCtrInsight).toBeDefined();
    });
  });
});
