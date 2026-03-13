import db from '../lib/db';

export function getDailyStats(filter: { advertiserId?: string, publisherId?: string } = {}) {
  let whereImp = 'WHERE created_at >= date(\'now\', \'-6 days\')';
  let whereClick = 'WHERE created_at >= date(\'now\', \'-6 days\')';
  const params: any[] = [];

  if (filter.advertiserId) {
    const subquery = 'SELECT ads.id FROM ads JOIN ad_groups ON ads.ad_group_id = ad_groups.id JOIN campaigns ON ad_groups.campaign_id = campaigns.id WHERE campaigns.advertiser_id = ?';
    whereImp += ` AND ad_id IN (${subquery})`;
    whereClick += ` AND ad_id IN (${subquery})`;
    params.push(filter.advertiserId);
  }
  if (filter.publisherId) {
    whereImp += ' AND publisher_id = ?';
    whereClick += ' AND publisher_id = ?';
    params.push(filter.publisherId);
  }

  const query = `
    WITH RECURSIVE dates(date) AS (
      SELECT date('now', '-6 days')
      UNION ALL
      SELECT date(date, '+1 day') FROM dates WHERE date < date('now')
    )
    SELECT 
      d.date,
      (SELECT COUNT(*) FROM impressions ${whereImp} AND date(created_at) = d.date) as impressions,
      (SELECT COUNT(*) FROM clicks ${whereClick} AND date(created_at) = d.date AND is_valid = 1) as clicks
    FROM dates d
  `;

  const queryParams = filter.advertiserId || filter.publisherId ? [...params, ...params] : [];
  return db.prepare(query).all(...queryParams);
}

export function getPlacementStats(advertiserId: string) {
  const query = `
    SELECT 
      p.id,
      p.name, 
      p.domain, 
      COALESCE(i.imps, 0) as impressions, 
      COALESCE(c.clicks, 0) as clicks
    FROM publishers p
    LEFT JOIN (
        SELECT publisher_id, COUNT(*) as imps 
        FROM impressions i
        JOIN ads a ON i.ad_id = a.id
        JOIN ad_groups ag ON a.ad_group_id = ag.id
        JOIN campaigns cp ON ag.campaign_id = cp.id
        WHERE cp.advertiser_id = ?
        GROUP BY publisher_id
    ) i ON p.id = i.publisher_id
    LEFT JOIN (
        SELECT publisher_id, COUNT(*) as clicks 
        FROM clicks c
        JOIN ads a ON c.ad_id = a.id
        JOIN ad_groups ag ON a.ad_group_id = ag.id
        JOIN campaigns cp ON ag.campaign_id = cp.id
        WHERE cp.advertiser_id = ? AND c.is_valid = 1
        GROUP BY publisher_id
    ) c ON p.id = c.publisher_id
    WHERE i.imps > 0 OR c.clicks > 0
    ORDER BY impressions DESC
  `;
  return db.prepare(query).all(advertiserId, advertiserId);
}
