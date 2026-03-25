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
    prisma.ad.count({ where: { review_status: 'pending' } }),
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

  // Issue #65: Admin Network Trends
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  
  const [impsLast24h, impsPrev24h, clicksLast24h, clicksPrev24h] = await Promise.all([
    prisma.impression.count({ where: { created_at: { gte: yesterday } } }),
    prisma.impression.count({ where: { created_at: { gte: twoDaysAgo, lt: yesterday } } }),
    prisma.click.count({ where: { created_at: { gte: yesterday }, is_valid: 1 } }),
    prisma.click.count({ where: { created_at: { gte: twoDaysAgo, lt: yesterday }, is_valid: 1 } }),
  ]);

  if (impsPrev24h > 100 && (impsLast24h / impsPrev24h) < 0.5) {
    insights.push({
      type: 'warning',
      title: 'インプレッション数の急減',
      description: `ネットワーク全体のインプレッション数が前日と比較して大幅に減少しています（${impsLast24h} vs ${impsPrev24h}）。配信システムに異常がないか確認してください。`,
    });
  }

  if (clicksPrev24h > 20 && (clicksLast24h / clicksPrev24h) < 0.5) {
    insights.push({
      type: 'warning',
      title: '有効クリック数の急減',
      description: `ネットワーク全体の有効クリック数が前日と比較して大幅に減少しています（${clicksLast24h} vs ${clicksPrev24h}）。広告の有効性や計測システムを確認してください。`,
    });
  }

  return insights;
}

export async function getAdvertiserInsights(advertiserId: number): Promise<Insight[]> {
  const insights: Insight[] = [];

  const [rejectedAdsCount, campaigns, advertiser, ads] = await Promise.all([
    prisma.ad.count({
      where: {
        status: 'rejected',
        adGroup: { campaign: { advertiser_id: advertiserId } }
      }
    }),
    prisma.campaign.findMany({
      where: { advertiser_id: advertiserId },
      select: { id: true, name: true, budget: true, spent: true, daily_budget: true }
    }),
    prisma.advertiser.findUnique({
      where: { id: advertiserId },
      select: { balance: true }
    }),
    prisma.ad.findMany({
      where: { adGroup: { campaign: { advertiser_id: advertiserId } }, review_status: 'approved' },
      include: {
        _count: {
          select: {
            impressions: true,
            clicks: { where: { is_valid: 1 } }
          }
        }
      }
    })
  ]);

  // Issue #66: Advertiser Tasks
  // 1. Rejected Ads
  if (rejectedAdsCount > 0) {
    insights.push({
      type: 'error',
      title: '広告が却下されました',
      description: `管理者に却下された広告が${rejectedAdsCount}件あります。内容を確認して修正してください。`,
    });
  }

  // 2. Budget Alerts (Total and Daily)
  const now = new Date();
  const startOfDay = new Date(now.setUTCHours(0, 0, 0, 0));

  for (const campaign of campaigns) {
    // Total Budget Check
    if (campaign.budget > 0 && (campaign.spent / campaign.budget) >= 0.9) {
      insights.push({
        type: 'warning',
        title: 'キャンペーン予算アラート',
        description: `キャンペーン「${campaign.name}」の総予算消化率が${Math.round((campaign.spent / campaign.budget) * 100)}%に達しています。`,
      });
    }

    // Daily Budget Check
    if (campaign.daily_budget > 0) {
      const dailySpent = await prisma.click.aggregate({
        where: {
          ad: { adGroup: { campaign_id: campaign.id } },
          is_valid: 1,
          created_at: { gte: startOfDay }
        },
        _sum: { cost: true }
      });
      
      const currentDailySpent = dailySpent._sum.cost || 0;
      const dailyUsage = currentDailySpent / campaign.daily_budget;

      if (dailyUsage >= 1.0) {
        insights.push({
          type: 'error',
          title: '日次予算の上限に達しました',
          description: `キャンペーン「${campaign.name}」の本日分の日次予算を使い切りました。配信が停止されています。`,
        });
      } else if (dailyUsage >= 0.9) {
        insights.push({
          type: 'warning',
          title: '日次予算アラート',
          description: `キャンペーン「${campaign.name}」の日次予算消化率が${Math.round(dailyUsage * 100)}%に達しています。`,
        });
      }
    }
  }

  // Issue #67: Advertiser Anomaly Detection
  // 1. Balance Check
  if (advertiser) {
    if (advertiser.balance < 1000) {
      insights.push({
        type: 'error',
        title: '残高不足アラート',
        description: `広告アカウントの残高が¥${advertiser.balance.toLocaleString()}です。残高が0になると広告配信が完全に停止します。`,
      });
    } else if (advertiser.balance < 5000) {
      insights.push({
        type: 'warning',
        title: '残高低下アラート',
        description: `広告アカウントの残高が少なくなっています（¥${advertiser.balance.toLocaleString()}）。早めのチャージを検討してください。`,
      });
    }
  }

  // 2. Low CTR Alert (Creative optimization)
  ads.forEach(ad => {
    const imps = ad._count.impressions;
    const clicks = ad._count.clicks;
    if (imps >= 100) {
      const ctr = clicks / imps;
      if (ctr < 0.005) { // CTR < 0.5%
        insights.push({
          type: 'warning',
          title: '広告のパフォーマンス低下',
          description: `広告「${ad.title}」のクリック率が著しく低くなっています（${(ctr * 100).toFixed(2)}%）。クリエイティブの改善を検討してください。`,
        });
      }
    }
  });

  return insights;
}

export async function getPublisherInsights(publisherId: number): Promise<Insight[]> {
  // To be implemented in later issues
  return [];
}
