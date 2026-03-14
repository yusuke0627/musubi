import prisma from '../lib/db';

export async function getDailyStats(filter: { advertiserId?: string, publisherId?: string } = {}) {
  const days = 7;
  const stats: { date: string, impressions: number, clicks: number }[] = [];
  
  // Generate last 7 days in UTC
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    stats.push({
      date: dateStr,
      impressions: 0,
      clicks: 0
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
    select: { created_at: true }
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
    if (entry) entry.clicks++;
  });

  return stats;
}

export async function getPlacementStats(advertiserId: string) {
  const advId = parseInt(advertiserId, 10);
  
  // Placement stats still benefit from a join, but let's see if we can do it with Prisma findMany
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
      }
    }
  });

  return publishers.map(p => ({
    id: p.id,
    name: p.name,
    domain: p.domain,
    impressions: p._count.impressions,
    clicks: p._count.clicks
  })).sort((a, b) => b.impressions - a.impressions);
}
