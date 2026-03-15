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
