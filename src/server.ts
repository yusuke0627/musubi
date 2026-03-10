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

app.get('/', (req, res) => {
  // 統計情報の取得
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions) as total_impressions,
      (SELECT COUNT(*) FROM clicks) as total_clicks
  `).get() as any;

  // ID降順で取得して最新の入稿を上に表示（各広告の統計情報も取得）
  const ads = db.prepare(`
    SELECT 
      ads.*,
      advertisers.balance as advertiser_balance,
      (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
      (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id) as clicks
    FROM ads 
    JOIN campaigns ON ads.campaign_id = campaigns.id
    JOIN advertisers ON campaigns.advertiser_id = advertisers.id
    ORDER BY ads.id DESC
  `).all();

  res.render('dashboard', { stats, ads });
});

// 広告の新規入稿
app.post('/ads', (req, res) => {
  const { title, description, image_url, target_url, max_bid } = req.body;
  
  // デモ用に最初のキャンペーン(ID:1)に紐づける
  const campaign_id = 1;
  const bid = max_bid ? parseFloat(max_bid) : 10;

  db.prepare('INSERT INTO ads (campaign_id, title, description, image_url, target_url, max_bid) VALUES (?, ?, ?, ?, ?, ?)')
    .run(campaign_id, title, description, image_url, target_url, bid);

  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`AdNetwork Server running at http://localhost:${PORT}`);
});
