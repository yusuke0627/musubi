import db from '../db';

export function runBillingWorker() {
  const processBatch = db.transaction(() => {
    const unprocessedClicks = db.prepare('SELECT * FROM clicks WHERE processed = 0 ORDER BY created_at ASC').all() as any[];
    if (unprocessedClicks.length === 0) return 0;

    for (const click of unprocessedClicks) {
      const duplicate = db.prepare(`
        SELECT id FROM clicks 
        WHERE ad_id = ? AND ip_address = ? AND is_valid = 1 AND id < ?
        AND created_at >= datetime(?, '-10 seconds')
        LIMIT 1
      `).get(click.ad_id, click.ip_address, click.id, click.created_at);

      if (duplicate) {
        db.prepare('UPDATE clicks SET is_valid = 0, processed = 1, invalid_reason = ? WHERE id = ?')
          .run('Duplicate click (10s)', click.id);
        continue;
      }

      // 広告グループから入札額を取得
      const adInfo = db.prepare(`
        SELECT ad_groups.max_bid, campaigns.advertiser_id 
        FROM ads 
        JOIN ad_groups ON ads.ad_group_id = ad_groups.id 
        JOIN campaigns ON ad_groups.campaign_id = campaigns.id 
        WHERE ads.id = ?
      `).get(click.ad_id) as any;

      if (!adInfo) {
        db.prepare('UPDATE clicks SET is_valid = 0, processed = 1, invalid_reason = ? WHERE id = ?')
          .run('Ad info not found', click.id);
        continue;
      }

      const result = db.prepare('UPDATE advertisers SET balance = balance - ? WHERE id = ? AND balance >= ?')
        .run(adInfo.max_bid, adInfo.advertiser_id, adInfo.max_bid);

      if (result.changes > 0) {
        db.prepare('UPDATE clicks SET is_valid = 1, processed = 1 WHERE id = ?').run(click.id);

        // パブリッシャー情報を取得 (報酬率を含む)
        const publisher = db.prepare('SELECT rev_share FROM publishers WHERE id = ?').get(click.publisher_id) as any;
        const revShare = publisher ? publisher.rev_share : 0.7; // デフォルト 70%
        const payoutAmount = adInfo.max_bid * revShare;

        // パブリッシャーに報酬を加算
        db.prepare('UPDATE publishers SET balance = balance + ?, total_earnings = total_earnings + ? WHERE id = ?')
          .run(payoutAmount, payoutAmount, click.publisher_id);
      } else {
        db.prepare('UPDATE clicks SET is_valid = 0, processed = 1, invalid_reason = ? WHERE id = ?')
          .run('Insufficient advertiser balance', click.id);
      }
    }
    return unprocessedClicks.length;
  });
  
  try {
    return processBatch();
  } catch (err) {
    console.error('[BillingWorker] Error:', err);
    throw err;
  }
}
