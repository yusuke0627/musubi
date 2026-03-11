import express from 'express';
import db from '../db';

const router = express.Router();
const PORT = 3000;

// ポータル画面（各画面へのリンク）
router.get('/', (req, res) => {
  const advertisers = db.prepare('SELECT id, name FROM advertisers').all();
  const publishers = db.prepare('SELECT id, name FROM publishers').all();
  res.render('index', { advertisers, publishers });
});

// 広告リクエストを受信
router.get('/serve', (req, res) => {
  const publisherId = req.query.publisher_id;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || '';
  
  // 簡易デバイス判定
  const isMobile = /Mobi|Android/i.test(ua);
  const currentDevice = isMobile ? 'mobile' : 'desktop';

  // RTB版：期待収益（eCPM）に基づき、最も収益性が高い広告を1件取得する
  const ad = db.prepare(`
    WITH ad_stats AS (
      SELECT 
        ads.id,
        ad_groups.max_bid,
        (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as imps,
        (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as valid_clicks
      FROM ads
      JOIN ad_groups ON ads.ad_group_id = ad_groups.id
      JOIN campaigns ON ad_groups.campaign_id = campaigns.id
      JOIN advertisers ON campaigns.advertiser_id = advertisers.id
      WHERE advertisers.balance >= ad_groups.max_bid
        AND (ad_groups.target_device = 'all' OR ad_groups.target_device = ?)
        AND (ad_groups.target_publisher_ids = 'all' OR ',' || ad_groups.target_publisher_ids || ',' LIKE ?)
    )
    SELECT ads.*, ad_groups.max_bid,
      CASE 
        WHEN s.imps < 5 THEN ad_groups.max_bid * 0.01 -- デフォルトCTR 1%
        ELSE ad_groups.max_bid * (CAST(s.valid_clicks AS REAL) / s.imps)
      END as score
    FROM ads
    JOIN ad_groups ON ads.ad_group_id = ad_groups.id
    JOIN ad_stats s ON ads.id = s.id
    ORDER BY score DESC, ads.id DESC
    LIMIT 1
  `).get(currentDevice, `%,${publisherId},%`) as any;

  if (!ad) {
    return res.status(204).send();
  }

  // インプレッションを記録
  db.prepare('INSERT INTO impressions (ad_id, publisher_id, user_agent, ip_address) VALUES (?, ?, ?, ?)')
    .run(ad.id, publisherId, ua, ip);

  // シンプルなHTML断片を返す
  const clickUrl = `http://localhost:${PORT}/click?ad_id=${ad.id}&publisher_id=${publisherId}`;
  
  res.send(`
    <a href="${clickUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block;">
      <div style="border: 1px solid #ccc; padding: 10px; text-align: center; font-family: sans-serif; max-width: 300px; cursor: pointer;">
        <h4 style="margin: 0 0 5px 0;">${ad.title}</h4>
        <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">${ad.description}</p>
        <img src="${ad.image_url}" style="width: 100%; border-radius: 4px; background: #eee; min-height: 100px;" alt="Ad Image" />
        <div style="font-size: 10px; color: #999; margin-top: 5px;">Sponsored by AdNetwork</div>
      </div>
    </a>
  `);
});

// トラッキング (Click Tracking)
router.get('/click', (req, res) => {
  const { ad_id, publisher_id } = req.query;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const ad = db.prepare('SELECT target_url FROM ads WHERE id = ?').get(ad_id) as any;
    if (ad) {
      db.prepare('INSERT INTO clicks (ad_id, publisher_id, user_agent, ip_address, processed) VALUES (?, ?, ?, ?, 0)')
        .run(ad_id, publisher_id, userAgent, ip);
      res.redirect(ad.target_url);
    } else {
      res.status(404).send('Ad not found');
    }
  } catch (err) {
    console.error('Click error:', err);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
