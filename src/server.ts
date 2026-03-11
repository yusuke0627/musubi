import express from 'express';
import path from 'path';
import db from './db';

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------
// 1. 配信エンジン (Ad Serving)
// ---------------------------------------------------------

// 広告リクエストを受信
app.get('/serve', (req, res) => {
  const publisherId = req.query.publisher_id;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || '';
  
  // 簡易デバイス判定
  const isMobile = /Mobi|Android/i.test(ua);
  const currentDevice = isMobile ? 'mobile' : 'desktop';

  // RTB簡易版：ターゲティング条件に合致し、かつ広告主の残高が入札額以上のものから1件取得
  const ad = db.prepare(`
    SELECT ads.* FROM ads 
    JOIN campaigns ON ads.campaign_id = campaigns.id
    JOIN advertisers ON campaigns.advertiser_id = advertisers.id
    WHERE advertisers.balance >= ads.max_bid
      -- デバイスターゲティング
      AND (campaigns.target_device = 'all' OR campaigns.target_device = ?)
      -- 媒体ターゲティング (カンマ区切りIDリストに含まれるか判定)
      AND (campaigns.target_publisher_ids = 'all' OR ',' || campaigns.target_publisher_ids || ',' LIKE ?)
    ORDER BY ads.max_bid DESC LIMIT 1
  `).get(currentDevice, `%,${publisherId},%`) as any;

  if (!ad) {
    return res.status(204).send(); // 広告なし（またはターゲット外）
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

// ---------------------------------------------------------
// 2. トラッキング (Click Tracking)
// ---------------------------------------------------------

app.get('/click', (req, res) => {
  const { ad_id, publisher_id } = req.query;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // 高速リダイレクト：DBへのログ挿入のみを行い、予算減算は後回しにする
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

// ---------------------------------------------------------
// 2.5 Billing Worker (非同期予算消費バッチ)
// ---------------------------------------------------------

function runBillingWorker() {
  const processBatch = db.transaction(() => {
    // 1. 未処理のクリックをまとめて取得
    const unprocessedClicks = db.prepare('SELECT * FROM clicks WHERE processed = 0 ORDER BY created_at ASC').all() as any[];
    if (unprocessedClicks.length === 0) return 0;

    console.log(`[BillingWorker] Processing ${unprocessedClicks.length} clicks...`);

    for (const click of unprocessedClicks) {
      // 2. 不正クリック検知（同一IP・短時間重複）
      // 直前10秒以内に、既に「有効(is_valid=1)」と判定された同じIP・広告のクリックがあるか確認
      const duplicate = db.prepare(`
        SELECT id FROM clicks 
        WHERE ad_id = ? AND ip_address = ? AND is_valid = 1 AND id < ?
        AND created_at >= datetime(?, '-10 seconds')
        LIMIT 1
      `).get(click.ad_id, click.ip_address, click.id, click.created_at);

      if (duplicate) {
        // 重複判定：無効化してスキップ
        db.prepare('UPDATE clicks SET is_valid = 0, processed = 1 WHERE id = ?').run(click.id);
        continue;
      }

      // 3. 広告情報の取得（入札額と広告主ID）
      const adInfo = db.prepare(`
        SELECT ads.max_bid, campaigns.advertiser_id 
        FROM ads 
        JOIN campaigns ON ads.campaign_id = campaigns.id 
        WHERE ads.id = ?
      `).get(click.ad_id) as any;

      if (!adInfo) {
        db.prepare('UPDATE clicks SET is_valid = 0, processed = 1 WHERE id = ?').run(click.id);
        continue;
      }

      // 4. 予算減算
      const result = db.prepare('UPDATE advertisers SET balance = balance - ? WHERE id = ? AND balance >= ?')
        .run(adInfo.max_bid, adInfo.advertiser_id, adInfo.max_bid);

      if (result.changes > 0) {
        // 成功
        db.prepare('UPDATE clicks SET is_valid = 1, processed = 1 WHERE id = ?').run(click.id);
      } else {
        // 予算不足などの場合は無効化（実際にはリトライなどの検討が必要）
        db.prepare('UPDATE clicks SET is_valid = 0, processed = 1 WHERE id = ?').run(click.id);
      }
    }
    return unprocessedClicks.length;
  });

  try {
    const processedCount = processBatch();
    if (processedCount > 0) {
      console.log(`[BillingWorker] Successfully processed ${processedCount} clicks.`);
    }
  } catch (err) {
    console.error('[BillingWorker] Error:', err);
  }
}

// 5秒おきにバッチを回す
setInterval(runBillingWorker, 5000);

// ---------------------------------------------------------
// 3. ダッシュボード (Admin/Advertiser/Publisher)
// ---------------------------------------------------------

// 過去7日間の日別統計を取得するヘルパー関数
function getDailyStats(filter: { advertiserId?: string, publisherId?: string } = {}) {
  let whereImp = 'WHERE created_at >= date(\'now\', \'-6 days\')';
  let whereClick = 'WHERE created_at >= date(\'now\', \'-6 days\')';
  const params: any[] = [];

  if (filter.advertiserId) {
    whereImp += ' AND ad_id IN (SELECT ads.id FROM ads JOIN campaigns ON ads.campaign_id = campaigns.id WHERE campaigns.advertiser_id = ?)';
    whereClick += ' AND ad_id IN (SELECT ads.id FROM ads JOIN campaigns ON ads.campaign_id = campaigns.id WHERE campaigns.advertiser_id = ?)';
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

  // パラメータは whereImp と whereClick で同じものを2回使うため調整
  const queryParams = filter.advertiserId || filter.publisherId ? [...params, ...params] : [];
  return db.prepare(query).all(...queryParams);
}

// ポータル画面（各画面へのリンク）
app.get('/', (req, res) => {
  const advertisers = db.prepare('SELECT id, name FROM advertisers').all();
  const publishers = db.prepare('SELECT id, name FROM publishers').all();
  res.render('index', { advertisers, publishers });
});

// 管理者画面 (Admin)
app.get('/admin', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions) as total_impressions,
      (SELECT COUNT(*) FROM clicks WHERE is_valid = 1) as total_clicks
  `).get() as any;

  const advertisers = db.prepare('SELECT * FROM advertisers').all();
  const publishers = db.prepare('SELECT * FROM publishers').all();
  const ads = db.prepare(`
    SELECT ads.*, advertisers.name as advertiser_name,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as clicks
    FROM ads
    JOIN campaigns ON ads.campaign_id = campaigns.id
    JOIN advertisers ON campaigns.advertiser_id = advertisers.id
  `).all();

  const dailyStats = getDailyStats();
  res.render('admin', { stats, advertisers, publishers, ads, dailyStats });
});

// 広告主画面 (Advertiser)
app.get('/advertiser/:id', (req, res) => {
  const advertiserId = req.params.id;
  const advertiser = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(advertiserId) as any;
  
  if (!advertiser) return res.status(404).send('Advertiser not found');

  const campaigns = db.prepare('SELECT * FROM campaigns WHERE advertiser_id = ?').all(advertiserId);
  const publishers = db.prepare('SELECT id, name FROM publishers').all();

  const ads = db.prepare(`
    SELECT ads.*,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as clicks
    FROM ads
    JOIN campaigns ON ads.campaign_id = campaigns.id
    WHERE campaigns.advertiser_id = ?
    ORDER BY ads.id DESC
  `).all(advertiserId);

  const dailyStats = getDailyStats({ advertiserId });
  res.render('advertiser', { advertiser, campaigns, publishers, ads, dailyStats });
});

// キャンペーンの新規作成
app.post('/campaigns', (req, res) => {
  const { advertiser_id, name, target_device, target_publishers } = req.body;

  let publisherIds = 'all';
  if (target_publishers) {
    const selected = Array.isArray(target_publishers) ? target_publishers : [target_publishers];
    // 'all' が含まれているか、何も選択されていない（実際にはHTMLの仕様上ここには来ないが）場合は 'all'
    if (selected.includes('all') || selected.length === 0) {
      publisherIds = 'all';
    } else {
      publisherIds = selected.join(',');
    }
  }

  db.prepare('INSERT INTO campaigns (advertiser_id, name, target_device, target_publisher_ids) VALUES (?, ?, ?, ?)')
    .run(advertiser_id, name, target_device, publisherIds);

  res.redirect(`/advertiser/${advertiser_id}`);
});

// 広告の新規入稿 (広告主用)
app.post('/ads', (req, res) => {
  const { advertiser_id, campaign_id, title, description, image_url, target_url, max_bid } = req.body;
  const bid = max_bid ? parseFloat(max_bid) : 10;

  db.prepare('INSERT INTO ads (campaign_id, title, description, image_url, target_url, max_bid) VALUES (?, ?, ?, ?, ?, ?)')
    .run(campaign_id, title, description, image_url, target_url, bid);

  res.redirect(`/advertiser/${advertiser_id}`);
});

// 媒体社画面 (Publisher)
app.get('/publisher/:id', (req, res) => {
  const publisherId = req.params.id;
  const publisher = db.prepare('SELECT * FROM publishers WHERE id = ?').get(publisherId) as any;

  if (!publisher) return res.status(404).send('Publisher not found');

  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions WHERE publisher_id = ?) as impressions,
      (SELECT COUNT(*) FROM clicks WHERE publisher_id = ? AND is_valid = 1) as clicks
  `).get(publisherId, publisherId) as any;

  const dailyStats = getDailyStats({ publisherId });
  res.render('publisher', { publisher, stats, port: PORT, dailyStats });
});

app.listen(PORT, () => {
  console.log(`AdNetwork Server running at http://localhost:${PORT}`);
});
