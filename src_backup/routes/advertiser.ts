import express from 'express';
import db from '../db';
import { getDailyStats } from '../services/stats';

const router = express.Router();

// 広告主画面 (Advertiser)
router.get('/:id', (req, res) => {
  const advertiserId = req.params.id;
  const advertiser = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(advertiserId) as any;

  if (!advertiser) return res.status(404).send('Advertiser not found');

  const campaigns = db.prepare('SELECT * FROM campaigns WHERE advertiser_id = ?').all(advertiserId);
  const adGroups = db.prepare('SELECT ad_groups.*, campaigns.name as campaign_name FROM ad_groups JOIN campaigns ON ad_groups.campaign_id = campaigns.id WHERE campaigns.advertiser_id = ?').all(advertiserId);
  const publishers = db.prepare('SELECT id, name FROM publishers').all();

  const ads = db.prepare(`
    SELECT ads.*, ad_groups.name as ad_group_name,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as clicks
    FROM ads
    JOIN ad_groups ON ads.ad_group_id = ad_groups.id
    JOIN campaigns ON ad_groups.campaign_id = campaigns.id
    WHERE campaigns.advertiser_id = ?
    ORDER BY ads.id DESC
  `).all(advertiserId);

  const dailyStats = getDailyStats({ advertiserId });
  res.render('advertiser', { advertiser, campaigns, adGroups, publishers, ads, dailyStats });
});

// キャンペーンの新規作成
router.post('/campaigns/new', (req, res) => {
  const { advertiser_id, name, budget } = req.body;
  db.prepare('INSERT INTO campaigns (advertiser_id, name, budget) VALUES (?, ?, ?)')
    .run(advertiser_id, name, budget || 0);
  res.redirect(`/advertiser/${advertiser_id}`);
});

// アドグループの新規作成
router.post('/ad_groups/new', (req, res) => {
  const { advertiser_id, campaign_id, name, max_bid, target_device, target_publishers } = req.body;

  let publisherIds = 'all';
  if (target_publishers) {
    const selected = Array.isArray(target_publishers) ? target_publishers : [target_publishers];
    if (selected.includes('all') || selected.length === 0) {
      publisherIds = 'all';
    } else {
      publisherIds = selected.join(',');
    }
  }

  db.prepare('INSERT INTO ad_groups (campaign_id, name, max_bid, target_device, target_publisher_ids) VALUES (?, ?, ?, ?, ?)')
    .run(campaign_id, name, max_bid, target_device, publisherIds);

  res.redirect(`/advertiser/${advertiser_id}`);
});

// 広告の新規入稿
router.post('/ads/new', (req, res) => {
  const { advertiser_id, ad_group_id, title, description, image_url, target_url } = req.body;
  db.prepare('INSERT INTO ads (ad_group_id, title, description, image_url, target_url) VALUES (?, ?, ?, ?, ?)')
    .run(ad_group_id, title, description, image_url, target_url);
  res.redirect(`/advertiser/${advertiser_id}`);
});

export default router;
