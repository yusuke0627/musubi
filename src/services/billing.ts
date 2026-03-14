import prisma from '../lib/db';
import { isBotUserAgent, isRateLimited, isDuplicate } from './ivt';

export async function runBillingWorker() {
  try {
    const unprocessedClicks = await prisma.click.findMany({
      where: { processed: 0 },
      orderBy: { created_at: 'asc' },
    });

    if (unprocessedClicks.length === 0) return 0;

    let processedCount = 0;

    for (const click of unprocessedClicks) {
      await prisma.$transaction(async (tx) => {
        // 1. Bot Detection
        if (isBotUserAgent(click.user_agent)) {
          await tx.click.update({
            where: { id: click.id },
            data: { is_valid: 0, processed: 1, invalid_reason: 'Bot detected' }
          });
          return;
        }

        // 2. Rate Limiting Check
        if (await isRateLimited(prisma, click.ip_address || '', click.id, click.created_at)) {
          await tx.click.update({
            where: { id: click.id },
            data: { is_valid: 0, processed: 1, invalid_reason: 'Rate limit exceeded' }
          });
          return;
        }

        // 3. Duplicate Click Check
        if (await isDuplicate(prisma, click.ad_id, click.ip_address || '', click.id, click.created_at)) {
          await tx.click.update({
            where: { id: click.id },
            data: { is_valid: 0, processed: 1, invalid_reason: 'Duplicate click (10s)' }
          });
          return;
        }

        // 広告情報を取得
        const ad = await tx.ad.findUnique({
          where: { id: click.ad_id },
          include: {
            adGroup: {
              include: {
                campaign: true
              }
            }
          }
        });

        if (!ad) {
          await tx.click.update({
            where: { id: click.id },
            data: { is_valid: 0, processed: 1, invalid_reason: 'Ad not found' }
          });
          return;
        }

        const maxBid = ad.adGroup.max_bid;
        const advertiserId = ad.adGroup.campaign.advertiser_id;
        const campaignId = ad.adGroup.campaign.id;

        // 広告主の残高チェックと減算
        const advertiser = await tx.advertiser.findUnique({
          where: { id: advertiserId }
        });

        if (advertiser && advertiser.balance >= maxBid) {
          // 残高減算
          await tx.advertiser.update({
            where: { id: advertiserId },
            data: { balance: { decrement: maxBid } }
          });

          // クリック確定
          await tx.click.update({
            where: { id: click.id },
            data: { is_valid: 1, processed: 1, cost: maxBid, campaign_id: campaignId }
          });

          // キャンペーン消化額加算
          await tx.campaign.update({
            where: { id: campaignId },
            data: { spent: { increment: maxBid } }
          });

          // パブリッシャー報酬加算
          const publisher = await tx.publisher.findUnique({
            where: { id: click.publisher_id }
          });
          const revShare = publisher?.rev_share ?? 0.7;
          const payoutAmount = maxBid * revShare;

          await tx.publisher.update({
            where: { id: click.publisher_id },
            data: { 
              balance: { increment: payoutAmount },
              total_earnings: { increment: payoutAmount }
            }
          });
        } else {
          await tx.click.update({
            where: { id: click.id },
            data: { is_valid: 0, processed: 1, invalid_reason: 'Insufficient advertiser balance' }
          });
        }
      });
      processedCount++;
    }

    return processedCount;
  } catch (err) {
    console.error('[BillingWorker] Error:', err);
    throw err;
  }
}
