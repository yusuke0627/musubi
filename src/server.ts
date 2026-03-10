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
  
  // 本来はターゲティングなどのロジックが入るが、ここではランダムに1件取得
  const ad = db.prepare('SELECT * FROM ads ORDER BY RANDOM() LIMIT 1').get() as any;

  if (!ad) {
    return res.status(204).send(); // 広告なし
  }

  // インプレッションを記録
  db.prepare('INSERT INTO impressions (ad_id, publisher_id, user_agent) VALUES (?, ?, ?)')
    .run(ad.id, publisherId, req.headers['user-agent']);

  // シンプルなHTML断片を返す
  const clickUrl = `http://localhost:${PORT}/click?ad_id=${ad.id}&publisher_id=${publisherId}`;
  
  res.send(`
    <div style="border: 1px solid #ccc; padding: 10px; text-align: center; font-family: sans-serif; max-width: 300px;">
      <h4 style="margin: 0 0 5px 0;">${ad.title}</h4>
      <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">${ad.description}</p>
      <a href="${clickUrl}" target="_blank">
        <img src="${ad.image_url}" style="width: 100%; border-radius: 4px;" />
      </a>
      <div style="font-size: 10px; color: #999; margin-top: 5px;">Sponsored by AdNetwork</div>
    </div>
  `);
});

// ---------------------------------------------------------
// 2. トラッキング (Click Tracking)
// ---------------------------------------------------------

app.get('/click', (req, res) => {
  const { ad_id, publisher_id } = req.query;

  // クリックを記録
  db.prepare('INSERT INTO clicks (ad_id, publisher_id, user_agent) VALUES (?, ?, ?)')
    .run(ad_id, publisher_id, req.headers['user-agent']);

  // 本来の遷移先を取得
  const ad = db.prepare('SELECT target_url FROM ads WHERE id = ?').get(ad_id) as any;

  if (ad) {
    res.redirect(ad.target_url);
  } else {
    res.status(404).send('Ad not found');
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

  // ID降順で取得して最新の入稿を上に表示
  const ads = db.prepare('SELECT * FROM ads ORDER BY id DESC').all();

  res.render('dashboard', { stats, ads });
});

// 広告の新規入稿
app.post('/ads', (req, res) => {
  const { title, description, image_url, target_url } = req.body;
  
  // デモ用に最初のキャンペーン(ID:1)に紐づける
  const campaign_id = 1;

  db.prepare('INSERT INTO ads (campaign_id, title, description, image_url, target_url) VALUES (?, ?, ?, ?, ?)')
    .run(campaign_id, title, description, image_url, target_url);

  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`AdNetwork Server running at http://localhost:${PORT}`);
});
