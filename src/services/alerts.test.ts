import { describe, it, expect, beforeEach } from 'vitest';
import { generateOptimizationAlerts, dismissAlert, restoreAlert, generatePublisherAlerts, dismissPublisherAlert, restorePublisherAlert } from './alerts';
import prisma from '../lib/db';
import { clearDatabase } from '../lib/test-utils';
import { AlertType } from '../types/alert';

describe('Alerts Service', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('generateOptimizationAlerts', () => {
    it('should detect campaign with no ads (NO_ADS_IN_CAMPAIGN)', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      // 広告なしのACTIVEキャンペーン（予算は設定済み）
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Empty Campaign',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.NO_ADS_IN_CAMPAIGN}-1`);
      expect(alerts.activeAlerts[0].severity).toBe('critical');
    });

    it('should not detect PAUSED campaign with no ads', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      // PAUSEDキャンペーン（広告なしでもアラート不要、予算は設定済み）
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Paused Campaign',
          status: 'PAUSED',
          budget: 10000,
          daily_budget: 1000,
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(0);
    });

    it('should not detect campaign with deliverable ads', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      const campaign = await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Campaign with Ads',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });
      
      const adGroup = await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: campaign.id,
          name: 'Test AdGroup',
        }
      });
      
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: adGroup.id,
          title: 'Test Ad',
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(0);
    });

    it('should detect campaign with only pending ads (NO_ADS_IN_CAMPAIGN)', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      const campaign = await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Campaign with Pending Ads',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });
      
      const adGroup = await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: campaign.id,
          name: 'Test AdGroup',
        }
      });
      
      // review_status='pending' の広告は配信可能ではない
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: adGroup.id,
          title: 'Pending Ad',
          target_url: 'http://test.com',
          review_status: 'pending',
          status: 'ACTIVE',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.NO_ADS_IN_CAMPAIGN}-1`);
    });

    it('should detect campaign with only paused ads (NO_ADS_IN_CAMPAIGN)', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      const campaign = await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Campaign with Paused Ads',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });
      
      const adGroup = await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: campaign.id,
          name: 'Test AdGroup',
        }
      });
      
      // status='PAUSED' の広告は配信可能ではない
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: adGroup.id,
          title: 'Paused Ad',
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'PAUSED',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.NO_ADS_IN_CAMPAIGN}-1`);
    });

    it('should detect parent paused (PARENT_PAUSED)', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      const campaign = await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Active Campaign',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });
      
      // PAUSEDの広告グループ
      await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: campaign.id,
          name: 'Paused AdGroup',
          status: 'PAUSED',
        }
      });
      
      // 広告も作成（広告未設定アラートが出ないように）
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: 1,
          title: 'Test Ad',
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.PARENT_PAUSED}-1`);
      expect(alerts.activeAlerts[0].severity).toBe('critical');
    });

    it('should detect no budget (NO_BUDGET)', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'No Budget Campaign',
          status: 'ACTIVE',
          budget: 0,
          daily_budget: 0,
        }
      });
      
      // 広告グループを作成（広告なしアラートが出ないようにするため）
      await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: 1,
          name: 'Test AdGroup',
        }
      });
      
      // 広告を作成（広告未設定アラートが出ないように）
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: 1,
          title: 'Test Ad',
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.NO_BUDGET}-1`);
      expect(alerts.activeAlerts[0].severity).toBe('warning');
    });

    it('should detect budget exhausted (BUDGET_EXHAUSTED)', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Exhausted Campaign',
          status: 'ACTIVE',
          budget: 1000,
          spent: 1000,
          daily_budget: 100,
        }
      });
      
      // 広告グループと広告を作成
      await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: 1,
          name: 'Test AdGroup',
        }
      });
      
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: 1,
          title: 'Test Ad',
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.BUDGET_EXHAUSTED}-1`);
      expect(alerts.activeAlerts[0].severity).toBe('warning');
    });

    it('should detect daily budget exhausted', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Daily Exhausted Campaign',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 100,
          today_spent: 100,
        }
      });
      
      // 広告グループと広告を作成
      await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: 1,
          name: 'Test AdGroup',
        }
      });
      
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: 1,
          title: 'Test Ad',
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.BUDGET_EXHAUSTED}-1`);
    });

    it('should sort alerts by severity', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      // critical: no ads
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Empty Campaign',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });
      
      // warning: no budget（広告あり）
      await prisma.campaign.create({
        data: {
          id: 2,
          advertiser_id: advertiser.id,
          name: 'No Budget Campaign',
          status: 'ACTIVE',
          budget: 0,
          daily_budget: 0,
        }
      });
      
      // 2番目のキャンペーンに広告グループと広告を作成
      await prisma.adGroup.create({
        data: {
          id: 1,
          campaign_id: 2,
          name: 'Test AdGroup',
        }
      });
      
      await prisma.ad.create({
        data: {
          id: 1,
          ad_group_id: 1,
          title: 'Test Ad',
          target_url: 'http://test.com',
          review_status: 'approved',
          status: 'ACTIVE',
        }
      });

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(2);
      expect(alerts.activeAlerts[0].severity).toBe('critical');
      expect(alerts.activeAlerts[1].severity).toBe('warning');
    });
  });

  describe('dismissAlert', () => {
    it('should mark alert as dismissed', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Empty Campaign',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });

      // Dismissする（NO_ADS_IN_CAMPAIGNではなくNO_BUDGETの方をDismiss）
      await dismissAlert(advertiser.id, `${AlertType.NO_ADS_IN_CAMPAIGN}-1`);

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(0);
      expect(alerts.dismissedAlerts).toHaveLength(1);
    });
  });

  describe('restoreAlert', () => {
    it('should restore dismissed alert', async () => {
      const advertiser = await prisma.advertiser.create({
        data: { id: 1, name: 'Test Advertiser' }
      });
      
      await prisma.campaign.create({
        data: {
          id: 1,
          advertiser_id: advertiser.id,
          name: 'Empty Campaign',
          status: 'ACTIVE',
          budget: 10000,
          daily_budget: 1000,
        }
      });

      // DismissしてからRestore
      await dismissAlert(advertiser.id, `${AlertType.NO_ADS_IN_CAMPAIGN}-1`);
      await restoreAlert(advertiser.id, `${AlertType.NO_ADS_IN_CAMPAIGN}-1`);

      const alerts = await generateOptimizationAlerts(advertiser.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.dismissedAlerts).toHaveLength(0);
    });
  });

  describe('generatePublisherAlerts', () => {
    it('should detect when balance reaches payout threshold (PAYOUT_THRESHOLD_REACHED)', async () => {
      const publisher = await prisma.publisher.create({
        data: { 
          id: 1, 
          name: 'Test Publisher',
          balance: 5000,
          min_payout_threshold: 5000,
        }
      });

      const alerts = await generatePublisherAlerts(publisher.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.PAYOUT_THRESHOLD_REACHED}-1`);
      expect(alerts.activeAlerts[0].severity).toBe('suggestion');
      expect(alerts.activeAlerts[0].title).toBe('支払い可能金額に達しました');
    });

    it('should detect when balance exceeds payout threshold', async () => {
      const publisher = await prisma.publisher.create({
        data: { 
          id: 1, 
          name: 'Test Publisher',
          balance: 10000,
          min_payout_threshold: 5000,
        }
      });

      const alerts = await generatePublisherAlerts(publisher.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.activeAlerts[0].id).toBe(`${AlertType.PAYOUT_THRESHOLD_REACHED}-1`);
    });

    it('should not generate alert when balance is below threshold', async () => {
      const publisher = await prisma.publisher.create({
        data: { 
          id: 1, 
          name: 'Test Publisher',
          balance: 1000,
          min_payout_threshold: 5000,
        }
      });

      const alerts = await generatePublisherAlerts(publisher.id);

      expect(alerts.activeAlerts).toHaveLength(0);
    });

    it('should return empty alerts for non-existent publisher', async () => {
      const alerts = await generatePublisherAlerts(999);

      expect(alerts.activeAlerts).toHaveLength(0);
      expect(alerts.dismissedAlerts).toHaveLength(0);
    });
  });

  describe('dismissPublisherAlert', () => {
    it('should mark publisher alert as dismissed', async () => {
      const publisher = await prisma.publisher.create({
        data: { 
          id: 1, 
          name: 'Test Publisher',
          balance: 5000,
          min_payout_threshold: 5000,
        }
      });

      // Dismissする
      await dismissPublisherAlert(publisher.id, `${AlertType.PAYOUT_THRESHOLD_REACHED}-1`);

      const alerts = await generatePublisherAlerts(publisher.id);

      expect(alerts.activeAlerts).toHaveLength(0);
      expect(alerts.dismissedAlerts).toHaveLength(1);
    });
  });

  describe('restorePublisherAlert', () => {
    it('should restore dismissed publisher alert', async () => {
      const publisher = await prisma.publisher.create({
        data: { 
          id: 1, 
          name: 'Test Publisher',
          balance: 5000,
          min_payout_threshold: 5000,
        }
      });

      // DismissしてからRestore
      await dismissPublisherAlert(publisher.id, `${AlertType.PAYOUT_THRESHOLD_REACHED}-1`);
      await restorePublisherAlert(publisher.id, `${AlertType.PAYOUT_THRESHOLD_REACHED}-1`);

      const alerts = await generatePublisherAlerts(publisher.id);

      expect(alerts.activeAlerts).toHaveLength(1);
      expect(alerts.dismissedAlerts).toHaveLength(0);
    });
  });
});
