import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'adnetwork.db'));

function seed() {
  console.log('🌱 Seeding realistic data...');

  // 既存データの削除
  db.exec(`
    DELETE FROM clicks;
    DELETE FROM impressions;
    DELETE FROM payouts;
    DELETE FROM ads;
    DELETE FROM ad_groups;
    DELETE FROM campaigns;
    DELETE FROM publishers;
    DELETE FROM advertisers;
  `);

  // 1. Advertisers
  const advertisers = [
    { id: 1, name: 'NovaTech Electronics', balance: 250000 },
    { id: 2, name: 'Luxe Global Travel', balance: 120000 },
    { id: 3, name: 'Organic Life Market', balance: 45000 },
  ];

  const insertAdv = db.prepare('INSERT INTO advertisers (id, name, balance) VALUES (?, ?, ?)');
  advertisers.forEach(a => insertAdv.run(a.id, a.name, a.balance));

  // 2. Publishers
  const publishers = [
    { id: 1, name: 'The Daily Herald', domain: 'dailyherald.com', rev_share: 0.7 },
    { id: 2, name: 'TechCruncher Blog', domain: 'techcruncher.io', rev_share: 0.8 },
    { id: 3, name: 'Modern Kitchen Recipes', domain: 'modernkitchen.net', rev_share: 0.65 },
  ];

  const insertPub = db.prepare('INSERT INTO publishers (id, name, domain, rev_share) VALUES (?, ?, ?, ?)');
  publishers.forEach(p => insertPub.run(p.id, p.name, p.domain, p.rev_share));

  // 3. Campaigns
  const campaigns = [
    { id: 1, advertiser_id: 1, name: 'Summer Smartphone Launch', budget: 100000, start_date: '2026-01-01 00:00:00' },
    { id: 2, advertiser_id: 2, name: 'European Getaway 2026', budget: 80000, start_date: '2026-01-01 00:00:00' },
    { id: 3, advertiser_id: 3, name: 'Spring Organic Fair', budget: 20000, start_date: '2026-01-01 00:00:00' },
  ];

  const insertCamp = db.prepare('INSERT INTO campaigns (id, advertiser_id, name, budget, start_date) VALUES (?, ?, ?, ?, ?)');
  campaigns.forEach(c => insertCamp.run(c.id, c.advertiser_id, c.name, c.budget, c.start_date));

  // 4. Ad Groups
  const adGroups = [
    { id: 1, campaign_id: 1, name: 'Tech Enthusiasts (Mobile)', max_bid: 120, device: 'mobile', is_all: 1 },
    { id: 2, campaign_id: 2, name: 'Luxury Travelers (Desktop)', max_bid: 250, device: 'desktop', is_all: 1 },
    { id: 3, campaign_id: 3, name: 'Healthy Eaters (All)', max_bid: 85, device: 'all', is_all: 1 },
  ];

  const insertGroup = db.prepare('INSERT INTO ad_groups (id, campaign_id, name, max_bid, target_device, is_all_publishers) VALUES (?, ?, ?, ?, ?, ?)');
  adGroups.forEach(g => insertGroup.run(g.id, g.campaign_id, g.name, g.max_bid, g.device, g.is_all));

  // 5. Ads (using images from public/images/)
  const ads = [
    { id: 1, group_id: 1, title: 'The New NovaPhone 15 Pro', desc: 'Experience the future of mobile technology.', img: '/images/1.jpeg', url: 'https://example.com/novaphone' },
    { id: 2, group_id: 2, title: 'Unforgettable Paris nights', desc: 'Book your luxury suite now and save 20%.', img: '/images/2.jpeg', url: 'https://example.com/paris' },
    { id: 3, group_id: 3, title: 'Fresh Greens, Every Day', desc: '100% certified organic produce delivered.', img: '/images/3.jpeg', url: 'https://example.com/organic' },
    { id: 4, group_id: 1, title: 'NovaWatch Series 5', desc: 'Track your health with precision.', img: '/images/4.png', url: 'https://example.com/novawatch' },
    { id: 5, group_id: 2, title: 'Tropical Island Escape', desc: 'All-inclusive resorts starting at $199.', img: '/images/5.jpeg', url: 'https://example.com/island' },
  ];

  const insertAd = db.prepare('INSERT INTO ads (id, ad_group_id, title, description, image_url, target_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  ads.forEach(ad => insertAd.run(ad.id, ad.group_id, ad.title, ad.desc, ad.img, ad.url, 'approved'));

  // 5.5 Pending Ads for Review Queue
  const pendingAds = [
    { id: 6, group_id: 1, title: 'NovaPad Air - Preorder Now', desc: 'The thinnest tablet ever made.', img: '/images/6.jpeg', url: 'https://example.com/novapad' },
    { id: 7, group_id: 3, title: 'Vegan Meal Kits', desc: 'Delicious recipes delivered to your door.', img: '/images/7.png', url: 'https://example.com/vegan' },
  ];
  pendingAds.forEach(ad => insertAd.run(ad.id, ad.group_id, ad.title, ad.desc, ad.img, ad.url, 'pending'));

  // 6. Historical Data (Last 7 Days)
  console.log('📈 Generating historical stats...');
  const insertImp = db.prepare('INSERT INTO impressions (ad_id, publisher_id, user_agent, ip_address, created_at) VALUES (?, ?, ?, ?, ?)');
  const insertClick = db.prepare('INSERT INTO clicks (ad_id, publisher_id, user_agent, ip_address, is_valid, processed, created_at) VALUES (?, ?, ?, ?, 1, 1, ?)');

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    ads.forEach(ad => {
      publishers.forEach(pub => {
        const imps = Math.floor(Math.random() * 50) + 10;
        const clicks = Math.floor(imps * (Math.random() * 0.1));

        for (let j = 0; j < imps; j++) {
          insertImp.run(ad.id, pub.id, 'Mozilla/5.0...', '127.0.0.1', `${dateStr} 12:00:00`);
        }
        for (let j = 0; j < clicks; j++) {
          insertClick.run(ad.id, pub.id, 'Mozilla/5.0...', '127.0.0.1', `${dateStr} 12:05:00`);
        }
      });
    });
  }

  // 7. Pending Clicks for Billing Management
  console.log('💰 Adding pending clicks for billing...');
  const insertPendingClick = db.prepare('INSERT INTO clicks (ad_id, publisher_id, user_agent, ip_address, processed, created_at) VALUES (?, ?, ?, ?, 0, datetime(\'now\'))');
  insertPendingClick.run(1, 1, 'Mozilla/5.0...', '192.168.1.5');
  insertPendingClick.run(2, 2, 'Mozilla/5.0...', '192.168.1.10');
  insertPendingClick.run(1, 3, 'Mozilla/5.0...', '10.0.0.1');

  // 8. Payout Data (History & Pending)
  console.log('💸 Adding payout requests and history...');
  const insertPayout = db.prepare('INSERT INTO payouts (publisher_id, amount, status, created_at, paid_at) VALUES (?, ?, ?, ?, ?)');
  
  // Pending request
  insertPayout.run(1, 5000, 'pending', '2026-03-10 10:00:00', null);
  insertPayout.run(2, 12000, 'pending', '2026-03-11 09:30:00', null);
  
  // Paid history
  insertPayout.run(1, 3500, 'paid', '2026-02-15 14:00:00', '2026-02-16 10:00:00');
  insertPayout.run(3, 8200, 'paid', '2026-03-01 11:00:00', '2026-03-02 09:00:00');

  // Update publisher balance/earnings to reflect simulation
  db.prepare('UPDATE publishers SET balance = balance + 1500, total_earnings = total_earnings + 10000 WHERE id = 1').run();
  db.prepare('UPDATE publishers SET balance = balance + 2500, total_earnings = total_earnings + 15000 WHERE id = 2').run();

  console.log('✅ Seeding completed!');
}

seed();
