import express from 'express';
import db from '../db';
import { getDailyStats } from '../services/stats';

const router = express.Router();

// 媒体社画面 (Publisher)
router.get('/:id', (req, res) => {
  const publisherId = req.params.id;
  const publisher = db.prepare('SELECT * FROM publishers WHERE id = ?').get(publisherId) as any;

  if (!publisher) return res.status(404).send('Publisher not found');

  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions WHERE publisher_id = ?) as impressions,
      (SELECT COUNT(*) FROM clicks WHERE publisher_id = ? AND is_valid = 1) as clicks
  `).get(publisherId, publisherId) as any;

  const payouts = db.prepare('SELECT * FROM payouts WHERE publisher_id = ? ORDER BY created_at DESC').all(publisherId);
  const dailyStats = getDailyStats({ publisherId });
  
  // PORT は index.ts で定義されているが、テンプレートで必要
  res.render('publisher', { publisher, stats, port: 3000, dailyStats, payouts });
});

// 支払いリクエスト
router.post('/payouts/request', (req, res) => {
  const { publisher_id } = req.body;
  const publisher = db.prepare('SELECT balance FROM publishers WHERE id = ?').get(publisher_id) as any;

  if (publisher && publisher.balance >= 1000) {
    db.transaction(() => {
      const amount = publisher.balance;
      db.prepare('INSERT INTO payouts (publisher_id, amount, status) VALUES (?, ?, ?)')
        .run(publisher_id, amount, 'pending');
      db.prepare('UPDATE publishers SET balance = balance - ? WHERE id = ?')
        .run(amount, publisher_id);
    })();
    res.redirect(`/publisher/${publisher_id}?payout=requested`);
  } else {
    res.redirect(`/publisher/${publisher_id}?error=insufficient_balance`);
  }
});

export default router;
