import prisma from '../lib/db';

export async function getDailyStats(filter: { advertiserId?: string, publisherId?: string } = {}) {
  const days = 7;
  const stats: { date: string, impressions: number, clicks: number, earnings: number }[] = [];
  
  // Generate last 7 days in UTC
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    stats.push({
      date: dateStr,
      impressions: 0,
      clicks: 0,
      earnings: 0
    });
  }

  const advId = filter.advertiserId ? parseInt(filter.advertiserId, 10) : undefined;
  const pubId = filter.publisherId ? parseInt(filter.publisherId, 10) : undefined;

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  startDate.setUTCHours(0, 0, 0, 0);

  // Impressions
  const impressions = await prisma.impression.findMany({
    where: {
      created_at: { gte: startDate },
      publisher_id: pubId,
      ad: advId ? {
        adGroup: {
          campaign: {
            advertiser_id: advId
          }
        }
      } : undefined
    },
    select: { created_at: true }
  });

  // Clicks
  const clicks = await prisma.click.findMany({
    where: {
      created_at: { gte: startDate },
      is_valid: 1,
      publisher_id: pubId,
      ad: advId ? {
        adGroup: {
          campaign: {
            advertiser_id: advId
          }
        }
      } : undefined
    },
    select: { created_at: true, cost: true, publisher_earnings: true }
  });

  // Group in JS
  impressions.forEach(imp => {
    const dateStr = imp.created_at.toISOString().split('T')[0];
    const entry = stats.find(s => s.date === dateStr);
    if (entry) entry.impressions++;
  });

  clicks.forEach(click => {
    const dateStr = click.created_at.toISOString().split('T')[0];
    const entry = stats.find(s => s.date === dateStr);
    if (entry) {
      entry.clicks++;
      // If filtering by publisher, show their earnings. If by advertiser, show their cost.
      entry.earnings += pubId ? click.publisher_earnings : click.cost;
    }
  });

  return stats;
}

export async function getPlacementStats(advertiserId: string) {
  const advId = parseInt(advertiserId, 10);
  
  // Placement stats with Conversions
  const publishers = await prisma.publisher.findMany({
    where: {
      OR: [
        { impressions: { some: { ad: { adGroup: { campaign: { advertiser_id: advId } } } } } },
        { clicks: { some: { ad: { adGroup: { campaign: { advertiser_id: advId } } }, is_valid: 1 } } }
      ]
    },
    include: {
      _count: {
        select: {
          impressions: {
            where: { ad: { adGroup: { campaign: { advertiser_id: advId } } } }
          },
          clicks: {
            where: { ad: { adGroup: { campaign: { advertiser_id: advId } } }, is_valid: 1 }
          }
        }
      },
      clicks: {
        where: { 
          ad: { adGroup: { campaign: { advertiser_id: advId } } },
          is_valid: 1 
        },
        select: {
          cost: true,
          conversions: {
            select: {
              revenue: true
            }
          }
        }
      }
    }
  });

  return publishers.map(p => {
    const totalCost = p.clicks.reduce((acc, curr) => acc + curr.cost, 0);
    const conversions = p.clicks.flatMap(c => c.conversions);
    const cvCount = conversions.length;
    const cvRevenue = conversions.reduce((acc, curr) => acc + curr.revenue, 0);

    return {
      id: p.id,
      name: p.name,
      domain: p.domain,
      impressions: p._count.impressions,
      clicks: p._count.clicks,
      cost: totalCost,
      conversions: cvCount,
      revenue: cvRevenue
    };
  }).sort((a, b) => b.impressions - a.impressions);
}

export async function getAdUnitStats(publisherId: string) {
  const pubId = parseInt(publisherId, 10);

  const adUnits = await prisma.adUnit.findMany({
    where: { app: { publisher_id: pubId } },
    include: {
      app: {
        select: { name: true }
      },
      _count: {
        select: {
          impressions: true,
          clicks: {
            where: { is_valid: 1 }
          }
        }
      },
      clicks: {
        where: { is_valid: 1 },
        select: {
          publisher_earnings: true
        }
      }
    }
  });

  return adUnits.map(unit => {
    const revenue = unit.clicks.reduce((acc, curr) => acc + curr.publisher_earnings, 0);
    return {
      id: unit.id,
      name: unit.name,
      app_name: unit.app.name,
      ad_type: unit.ad_type,
      width: unit.width,
      height: unit.height,
      impressions: unit._count.impressions,
      clicks: unit._count.clicks,
      revenue: revenue
    };
  }).sort((a, b) => b.revenue - a.revenue); // 収益順にソートして返すよ！💰
}
