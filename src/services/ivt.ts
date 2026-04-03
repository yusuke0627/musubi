import type { PrismaClient } from "../../prisma/generated/prisma/client";

/**
 * Checks if the given User-Agent string belongs to a known bot, crawler, or scraper.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  
  const botPatterns = [
    'bot', 'crawler', 'spider', 'headless', 'puppeteer', 'playwright', 
    'phantom', 'slurp', 'bingbot', 'yandexbot', 'baiduspider', 
    'googlebot', 'curl', 'wget', 'postman'
  ];

  const lowerUa = userAgent.toLowerCase();
  return botPatterns.some(pattern => lowerUa.includes(pattern));
}

/**
 * Checks if the IP address has exceeded the rate limit.
 * Rule: Maximum of 50 clicks per hour from the same IP address.
 */
export async function isRateLimited(prisma: PrismaClient, ipAddress: string, clickId: number, createdAt: Date): Promise<boolean> {
  if (!ipAddress || ipAddress === 'unknown') return false;

  const oneHourAgo = new Date(createdAt.getTime() - 60 * 60 * 1000);

  const count = await prisma.click.count({
    where: {
      ip_address: ipAddress,
      id: { lt: clickId },
      created_at: { gte: oneHourAgo }
    }
  });

  return count >= 50;
}

/**
 * Checks if the click occurred too soon after the impression.
 * Rule: Minimum 1 second (1000ms) required between impression and click.
 */
export async function isTooFastClick(prisma: PrismaClient, click: any): Promise<boolean> {
  if (!click.imp_id) return true; // Invalid if no impression ID is linked

  const impression = await prisma.impression.findUnique({
    where: { imp_id: click.imp_id }
  });

  if (!impression) return true; // Invalid if linked impression is not found

  const timeDiff = click.created_at.getTime() - impression.created_at.getTime();
  
  // しきい値: 1000ms (1秒)
  return timeDiff < 1000;
}

/**
 * Checks if the click is a duplicate of a recent click.
 * Rule: Identical ad_id and ip_address within 10 seconds.
 */
export async function isDuplicate(prisma: PrismaClient, adId: number, ipAddress: string, clickId: number, createdAt: Date): Promise<boolean> {
  if (!ipAddress || ipAddress === 'unknown') return false;

  const tenSecondsAgo = new Date(createdAt.getTime() - 10 * 1000);

  const duplicate = await prisma.click.findFirst({
    where: {
      ad_id: adId,
      ip_address: ipAddress,
      is_valid: 1,
      id: { lt: clickId },
      created_at: { gte: tenSecondsAgo }
    },
    select: { id: true }
  });

  return !!duplicate;
}
