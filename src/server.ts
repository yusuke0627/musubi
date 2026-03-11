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
  
  // RTB簡易版：広告主の残高が入札額以上のものから、最も入札額（max_bid）が高い広告を1件取得する
  const ad = db.prepare(`
    SELECT ads.* FROM ads 
    JOIN campaigns ON ads.campaign_id = campaigns.id
    JOIN advertisers ON campaigns.advertiser_id = advertisers.id
    WHERE advertisers.balance >= ads.max_bid
    ORDER BY ads.max_bid DESC LIMIT 1
  `).get() as any;

  if (!ad) {
    return res.status(204).send(); // 広告なし（または予算切れ）
  }

  // インプレッションを記録
  db.prepare('INSERT INTO impressions (ad_id, publisher_id, user_agent) VALUES (?, ?, ?)')
    .run(ad.id, publisherId, req.headers['user-agent']);

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

  // トランザクションでクリック記録と残高減算を行う
  const performClick = db.transaction((adId, pubId, ua) => {
    // 1. 広告情報を取得（入札額と広告主ID）
    const ad = db.prepare(`
      SELECT ads.max_bid, campaigns.advertiser_id, ads.target_url 
      FROM ads 
      JOIN campaigns ON ads.campaign_id = campaigns.id 
      WHERE ads.id = ?
    `).get(adId) as any;

    if (!ad) {
      console.log(`Ad not found: ID=${adId}`);
      return null;
    }

    // 2. 広告主の残高を減らす
    const result = db.prepare('UPDATE advertisers SET balance = balance - ? WHERE id = ? AND balance >= ?')
      .run(ad.max_bid, ad.advertiser_id, ad.max_bid);

    console.log(`Click for Ad ${adId}: Balance update result changes=${result.changes}`);

    if (result.changes === 0) {
      // 予算不足等の理由で更新できなかった場合
      console.warn(`Insufficient balance or update failed for Advertiser ${ad.advertiser_id}`);
      return ad.target_url;
    }

    // 3. クリックを記録
    db.prepare('INSERT INTO clicks (ad_id, publisher_id, user_agent) VALUES (?, ?, ?)')
      .run(adId, pubId, ua);

    return ad.target_url;
  });

  try {
    const targetUrl = performClick(ad_id, publisher_id, req.headers['user-agent']);
    if (targetUrl) {
      res.redirect(targetUrl);
    } else {
      res.status(404).send('Ad not found');
    }
  } catch (err) {
    console.error('Click tracking error:', err);
    res.status(500).send('Internal Server Error');
  }
});

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
      (SELECT COUNT(*) FROM clicks ${whereClick} AND date(created_at) = d.date) as clicks
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
      (SELECT COUNT(*) FROM clicks) as total_clicks
  `).get() as any;

  const advertisers = db.prepare('SELECT * FROM advertisers').all();
  const publishers = db.prepare('SELECT * FROM publishers').all();
  const ads = db.prepare(`
    SELECT ads.*, advertisers.name as advertiser_name,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id) as clicks
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

  const ads = db.prepare(`
    SELECT ads.*,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id) as clicks
    FROM ads
    JOIN campaigns ON ads.campaign_id = campaigns.id
    WHERE campaigns.advertiser_id = ?
    ORDER BY ads.id DESC
  `).all(advertiserId);

  const dailyStats = getDailyStats({ advertiserId });
  res.render('advertiser', { advertiser, ads, dailyStats });
});

// 媒体社画面 (Publisher)
app.get('/publisher/:id', (req, res) => {
  const publisherId = req.params.id;
  const publisher = db.prepare('SELECT * FROM publishers WHERE id = ?').get(publisherId) as any;

  if (!publisher) return res.status(404).send('Publisher not found');

  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions WHERE publisher_id = ?) as impressions,
      (SELECT COUNT(*) FROM clicks WHERE publisher_id = ?) as clicks
  `).get(publisherId, publisherId) as any;

  const dailyStats = getDailyStats({ publisherId });
  res.render('publisher', { publisher, stats, port: PORT, dailyStats });
});

// 広告の新規入稿 (広告主用)
app.post('/ads', (req, res) => {
  const { advertiser_id, title, description, image_url, target_url, max_bid } = req.body;
  
  // 指定された広告主の最初のキャンペーンに紐づける（デモ用）
  let campaign = db.prepare('SELECT id FROM campaigns WHERE advertiser_id = ? LIMIT 1').get(advertiser_id) as any;
  
  if (!campaign) {
    const result = db.prepare('INSERT INTO campaigns (advertiser_id, name) VALUES (?, ?)').run(advertiser_id, 'Default Campaign');
    campaign = { id: result.lastInsertRowid };
  }

  const bid = max_bid ? parseFloat(max_bid) : 10;

  db.prepare('INSERT INTO ads (campaign_id, title, description, image_url, target_url, max_bid) VALUES (?, ?, ?, ?, ?, ?)')
    .run(campaign.id, title, description, image_url, target_url, bid);

  res.redirect(`/advertiser/${advertiser_id}`);
});

app.listen(PORT, () => {
  console.log(`AdNetwork Server running at http://localhost:${PORT}`);
});
