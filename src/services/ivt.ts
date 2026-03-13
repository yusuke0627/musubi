import { Database } from 'better-sqlite3';

/**
 * Checks if the given User-Agent string belongs to a known bot, crawler, or scraper.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false; // Empty UA might be suspicious, but not definitively a bot string
  
  const botPatterns = [
    'bot',
    'crawler',
    'spider',
    'headless',
    'puppeteer',
    'playwright',
    'phantom',
    'slurp',
    'bingbot',
    'yandexbot',
    'baiduspider',
    'googlebot',
    'curl',
    'wget',
    'postman'
  ];

  const lowerUa = userAgent.toLowerCase();
  return botPatterns.some(pattern => lowerUa.includes(pattern));
}

/**
 * Checks if the IP address has exceeded the rate limit.
 * Rule: Maximum of 50 clicks per hour from the same IP address.
 */
export function isRateLimited(db: Database, ipAddress: string, clickId: number, createdAt: string): boolean {
  if (!ipAddress || ipAddress === 'unknown') return false;

  const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM clicks 
    WHERE ip_address = ? 
      AND id < ?
      AND created_at >= datetime(?, '-1 hour')
  `).get(ipAddress, clickId, createdAt) as { count: number };

  return result.count >= 50;
}

/**
 * Checks if the click is a duplicate of a recent click.
 * Rule: Identical ad_id and ip_address within 10 seconds.
 */
export function isDuplicate(db: Database, adId: number, ipAddress: string, clickId: number, createdAt: string): boolean {
  if (!ipAddress || ipAddress === 'unknown') return false;

  const duplicate = db.prepare(`
    SELECT id FROM clicks 
    WHERE ad_id = ? AND ip_address = ? AND is_valid = 1 AND id < ?
    AND created_at >= datetime(?, '-10 seconds')
    LIMIT 1
  `).get(adId, ipAddress, clickId, createdAt);

  return !!duplicate;
}
