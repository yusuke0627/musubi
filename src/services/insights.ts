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
      title: '審査待ちの広告',
      description: `${pendingAds}件の新しい広告が審査を待っています。`,
      link: '#pending-ads',
      linkLabel: '広告を審査する'
    });
  }

  if (pendingPayouts > 0) {
    insights.push({
      type: 'warning',
      title: '保留中の支払いリクエスト',
      description: `${pendingPayouts}件の支払いリクエストが処理を待っています。`,
      link: '#pending-payouts',
      linkLabel: '支払いを処理する'
    });
  }

  if (unprocessedClicks > 0) {
    insights.push({
      type: 'info',
      title: '未処理のクリック',
      description: `${unprocessedClicks}件のクリックが請求処理を待っています。`,
      link: '#pending-clicks',
      linkLabel: 'クリックを処理する'
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
      title: 'ネットワーク全体のIVT率上昇',
      description: `異常なIVT率が検知されました。過去24時間のクリックの${Math.round((invalidClicksLast24h / totalClicksLast24h) * 100)}%が無効です。`,
    });
  }

  // 2. Low Balance Advertisers
  const lowBalanceAdsCount = await prisma.advertiser.count({ where: { balance: { lt: 1000 } } });
  if (lowBalanceAdsCount > 0) {
    insights.push({
      type: 'warning',
      title: '広告主の残高アラート',
      description: `${lowBalanceAdsCount}社の広告主の残高が1,000円を下回っています。これらのアカウントの広告配信がまもなく停止する可能性があります。`,
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
