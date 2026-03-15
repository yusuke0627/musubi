import prisma from '../lib/db';

export interface Insight {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

export async function getAdminInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Issue #1: Admin Task-based Insights
  const [pendingAds, pendingPayouts, unprocessedClicks] = await Promise.all([
    prisma.ad.count({ where: { status: 'pending' } }),
    prisma.payout.count({ where: { status: 'pending' } }),
    prisma.click.count({ where: { processed: 0 } }),
  ]);

  if (pendingAds > 0) {
    insights.push({
      type: 'info',
      title: 'Ads Awaiting Review',
      description: `There are ${pendingAds} new ads that need to be reviewed.`,
      link: '#pending-ads',
      linkLabel: 'Review Ads'
    });
  }

  if (pendingPayouts > 0) {
    insights.push({
      type: 'warning',
      title: 'Pending Payouts',
      description: `There are ${pendingPayouts} payout requests waiting for processing.`,
      link: '#pending-payouts',
      linkLabel: 'Process Payouts'
    });
  }

  if (unprocessedClicks > 0) {
    insights.push({
      type: 'info',
      title: 'Unprocessed Clicks',
      description: `There are ${unprocessedClicks} clicks waiting for the billing worker.`,
      link: '#pending-clicks',
      linkLabel: 'Process Clicks'
    });
  }

  // Issue #64: Admin Anomaly Detection
  // 1. High IVT Rate (Last 24h)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const totalClicksLast24h = await prisma.click.count({ where: { created_at: { gte: yesterday } } });
  const invalidClicksLast24h = await prisma.click.count({ where: { created_at: { gte: yesterday }, is_valid: 0, processed: 1 } });
  
  if (totalClicksLast24h >= 50 && (invalidClicksLast24h / totalClicksLast24h) > 0.2) {
    insights.push({
      type: 'error',
      title: 'High Network IVT Rate',
      description: `Abnormal IVT rate detected: ${Math.round((invalidClicksLast24h / totalClicksLast24h) * 100)}% of clicks in the last 24h are invalid.`,
    });
  }

  // 2. Low Balance Advertisers
  const lowBalanceAdsCount = await prisma.advertiser.count({ where: { balance: { lt: 1000 } } });
  if (lowBalanceAdsCount > 0) {
    insights.push({
      type: 'warning',
      title: 'Advertiser Balance Alert',
      description: `${lowBalanceAdsCount} advertisers have a balance below ¥1,000. Ads for these accounts may stop serving soon.`,
    });
  }

  return insights;
}

export async function getAdvertiserInsights(advertiserId: number): Promise<Insight[]> {
  // To be implemented in later issues
  return [];
}

export async function getPublisherInsights(publisherId: number): Promise<Insight[]> {
  // To be implemented in later issues
  return [];
}
