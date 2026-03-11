import express from 'express';
import db from '../db';
import { runBillingWorker } from '../services/billing';
import { getDailyStats } from '../services/stats';

const router = express.Router();

// 管理者画面 (Admin)
router.get('/', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions) as total_impressions,
      (SELECT COUNT(*) FROM clicks WHERE is_valid = 1) as total_clicks
  `).get() as any;

  const advertisers = db.prepare('SELECT * FROM advertisers').all();
  const publishers = db.prepare('SELECT * FROM publishers').all();
  const adGroups = db.prepare('SELECT ad_groups.*, campaigns.name as campaign_name FROM ad_groups JOIN campaigns ON ad_groups.campaign_id = campaigns.id').all();
  const ads = db.prepare(`
    SELECT ads.*, advertisers.name as advertiser_name, ad_groups.name as ad_group_name, ad_groups.max_bid as current_bid,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as clicks,
    CASE 
      WHEN (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) < 5 THEN ad_groups.max_bid * 0.01
      ELSE ad_groups.max_bid * (CAST((SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) AS REAL) / (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id))
    END as score
    FROM ads
    JOIN ad_groups ON ads.ad_group_id = ad_groups.id
    JOIN campaigns ON ad_groups.campaign_id = campaigns.id
    JOIN advertisers ON campaigns.advertiser_id = advertisers.id
    ORDER BY score DESC
  `).all();

  const dailyStats = getDailyStats();

  // クリック履歴の取得
  const pendingClicks = db.prepare('SELECT clicks.*, ads.title as ad_title FROM clicks JOIN ads ON clicks.ad_id = ads.id WHERE processed = 0 ORDER BY created_at DESC').all();
  const processedClicks = db.prepare('SELECT clicks.*, ads.title as ad_title FROM clicks JOIN ads ON clicks.ad_id = ads.id WHERE processed = 1 ORDER BY created_at DESC LIMIT 50').all();

  // 支払いリクエストの取得
  const pendingPayouts = db.prepare('SELECT payouts.*, publishers.name as publisher_name FROM payouts JOIN publishers ON payouts.publisher_id = publishers.id WHERE status = \'pending\' ORDER BY created_at ASC').all();
  const processedPayouts = db.prepare('SELECT payouts.*, publishers.name as publisher_name FROM payouts JOIN publishers ON payouts.publisher_id = publishers.id WHERE status = \'paid\' ORDER BY paid_at DESC LIMIT 50').all();

  // 審査待ち広告の取得
  const pendingAds = db.prepare('SELECT ads.*, advertisers.name as advertiser_name FROM ads JOIN ad_groups ON ads.ad_group_id = ad_groups.id JOIN campaigns ON ad_groups.campaign_id = campaigns.id JOIN advertisers ON campaigns.advertiser_id = advertisers.id WHERE ads.status = \'pending\' ORDER BY ads.id ASC').all();

  res.render('admin', { stats, advertisers, publishers, adGroups, ads, dailyStats, pendingClicks, processedClicks, pendingPayouts, processedPayouts, pendingAds });
});

// 手動クリック処理（バッチ実行）
router.post('/process-clicks', (req, res) => {
  try {
    const processedCount = runBillingWorker();
    res.redirect('/admin?processed=' + processedCount);
  } catch (err) {
    res.status(500).send('Error processing clicks');
  }
});

// 支払い完了処理
router.post('/payouts/complete', (req, res) => {
  const { payout_id } = req.body;
  db.prepare('UPDATE payouts SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('paid', payout_id);
  res.redirect('/admin#payouts');
});

// 報酬率の更新
router.post('/publishers/update-rev-share', (req, res) => {
  const { publisher_id, rev_share } = req.body;
  db.prepare('UPDATE publishers SET rev_share = ? WHERE id = ?')
    .run(parseFloat(rev_share), publisher_id);
  res.redirect('/admin#publishers');
});

// 広告審査
router.post('/ads/review', (req, res) => {
  const { ad_id, action, rejection_reason } = req.body;
  const status = action === 'approve' ? 'approved' : 'rejected';
  
  db.prepare('UPDATE ads SET status = ?, rejection_reason = ? WHERE id = ?')
    .run(status, status === 'rejected' ? rejection_reason : null, ad_id);
  
  res.redirect('/admin#ad-review');
});

export default router;
