import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const IMAGES = [
  "https://www.bandai.co.jp/images/character/chiikawa/img_keyvisual.jpg?d=1760092510",
  "https://dvs-cover.kodansha.co.jp/0000349299/ET2o0YvqQ18MRJ35RyGW891gRaagQsvHWphUxkZk.jpg",
  "https://odm-shop.talkingheads.biz/cdn/shop/files/ODM___0926c___2048x2048_bb7644ab-436e-408f-adda-cecfdf09e2ac_2048x.jpg?v=1697105317",
  "https://lens.usercontent.google.com/image?vsrid=CPCblf7whcSTLRACGAEiJDgyMGM2ODZiLTg2MWUtNDBlNC1hNjAyLTYyN2I1NjI5OThhZDIGIgJ0YSgWOMqu2umno5MD&gsessionid=oBIWsmx30obkZxll0BYXVuyRT29ueLiPv9m9BAfI2xU2FFX1zS6PGw",
  "https://odm-shop.talkingheads.biz/cdn/shop/files/ODM___0926b___2048x2048_6ec50c70-8f01-4253-a0f1-145563697347_2048x.jpg?v=1696576409",
  "https://stat.ameba.jp/user_images/20251106/20/bocchisora-0411/80/60/j/o0770108015710979759.jpg",
  "https://m.media-amazon.com/images/I/510KVuiKagL._AC_UF1000,1000_QL80_.jpg"
];

async function seed() {
  console.log('🌟 Seeding a vibrant, bustling ad network dataset...');

  // 1. Clear everything
  await prisma.$transaction([
    prisma.click.deleteMany(),
    prisma.impression.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.ad.deleteMany(),
    prisma.adSchedule.deleteMany(),
    prisma.adGroupTargetPublisher.deleteMany(),
    prisma.adGroup.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.publisher.deleteMany(),
    prisma.advertiser.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 2. Advertisers (Diversity)
  const advertisers = [
    { id: 1, name: 'Bandai Character Shop', balance: 1500000 },
    { id: 2, name: 'Kodansha Comics', balance: 800000 },
    { id: 3, name: 'Talking Heads ODM', balance: 300000 },
    { id: 4, name: 'Ameba Entertainment', balance: 50000 }, // Medium balance
    { id: 5, name: 'Small Startup', balance: 800 }, // Trigger Low Balance Alert
  ];
  for (const a of advertisers) {
    await prisma.advertiser.create({ data: { id: a.id, name: a.name, balance: a.balance } });
    await prisma.user.create({ data: { email: `adv${a.id}@example.com`, password_hash: passwordHash, role: 'advertiser', linked_id: a.id } });
  }

  // 3. Publishers (Variety)
  const publishers = [
    { id: 1, name: 'Anime News Network', domain: 'animenews.com', rev_share: 0.7, balance: 125000 },
    { id: 2, name: 'Otaku Culture Blog', domain: 'otakublog.jp', rev_share: 0.8, balance: 45000 },
    { id: 3, name: 'Gamer Portal', domain: 'gamerportal.net', rev_share: 0.65, balance: 12000 },
    { id: 4, name: 'High-IVT Suspicious Site', domain: 'sketchy-ads.biz', rev_share: 0.5, balance: 0 },
  ];
  for (const p of publishers) {
    await prisma.publisher.create({ data: p });
    await prisma.user.create({ data: { email: `pub${p.id}@example.com`, password_hash: passwordHash, role: 'publisher', linked_id: p.id } });
  }

  // 4. Admin
  await prisma.user.create({ data: { email: 'admin@adnetwork.local', password_hash: passwordHash, role: 'admin' } });

  // 5. Campaigns & Ad Groups & Ads
  console.log('📦 Creating campaigns and creative assets...');
  
  // Campaign 1: Chiikawa Festival (High budget, bustling)
  await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Chiikawa Summer Festival', budget: 1000000, daily_budget: 50000, spent: 450000 } });
  await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Main Visual', max_bid: 150 } });
  await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'ちいかわマーケットOPEN!', image_url: IMAGES[0], target_url: 'https://chiikawa-market.jp/', status: 'approved' } });

  // Campaign 2: Manga Launch (Normal activity)
  await prisma.campaign.create({ data: { id: 2, advertiser_id: 2, name: 'New Manga Release 2026', budget: 500000, daily_budget: 20000, spent: 120000 } });
  await prisma.adGroup.create({ data: { id: 2, campaign_id: 2, name: 'Manga Covers', max_bid: 100 } });
  await prisma.ad.create({ data: { id: 2, ad_group_id: 2, title: '話題の新作、ついに配信開始！', image_url: IMAGES[1], target_url: 'https://pocket.shonenmagazine.com/', status: 'approved' } });

  // Campaign 3: Apparel ODM (Fashion focused)
  await prisma.campaign.create({ data: { id: 3, advertiser_id: 3, name: 'Talking Heads Collection', budget: 200000, daily_budget: 5000, spent: 185000 } }); // Near total budget
  await prisma.adGroup.create({ data: { id: 3, campaign_id: 3, name: 'Lifestyle Shots', max_bid: 80 } });
  await prisma.ad.create({ data: { id: 3, ad_group_id: 3, title: '限定コラボTシャツ登場', image_url: IMAGES[2], target_url: 'https://talkingheads.biz/', status: 'approved' } });
  await prisma.ad.create({ data: { id: 4, ad_group_id: 3, title: '秋の新作ラインナップ', image_url: IMAGES[4], target_url: 'https://talkingheads.biz/collections/new', status: 'approved' } });

  // Campaign 4: Budget Test (Daily limit alert)
  await prisma.campaign.create({ data: { id: 4, advertiser_id: 4, name: 'Daily Budget Stress Test', budget: 100000, daily_budget: 1000, spent: 50000 } });
  await prisma.adGroup.create({ data: { id: 4, campaign_id: 4, name: 'Stress Test Group', max_bid: 120 } });
  await prisma.ad.create({ data: { id: 5, ad_group_id: 4, title: 'アメブロ新着ニュース', image_url: IMAGES[5], target_url: 'https://ameblo.jp/', status: 'approved' } });

  // Campaign 5: Low CTR / Anomaly Test
  await prisma.campaign.create({ data: { id: 5, advertiser_id: 1, name: 'Ghost Campaign', budget: 100000, spent: 5000 } });
  await prisma.adGroup.create({ data: { id: 5, campaign_id: 5, name: 'Unpopular Group', max_bid: 50 } });
  await prisma.ad.create({ data: { id: 6, ad_group_id: 5, title: '誰もクリックしない広告', image_url: IMAGES[6], target_url: 'https://amazon.co.jp/', status: 'approved' } });

  // Campaign 6: Rejected Ad Test
  await prisma.campaign.create({ data: { id: 6, advertiser_id: 2, name: 'Policy Violation Test', budget: 10000 } });
  await prisma.adGroup.create({ data: { id: 6, campaign_id: 6, name: 'Rejected Group', max_bid: 200 } });
  await prisma.ad.create({ data: { id: 7, ad_group_id: 6, title: '不適切な広告コンテンツ', image_url: IMAGES[3], target_url: 'https://google.com/', status: 'rejected', rejection_reason: '画像の著作権侵害の疑いがあります。' } });

  // 6. Generate Bustling Stats (Last 7 Days)
  console.log('📈 Generating complex time-series data...');
  const now = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    date.setUTCHours(12, 0, 0, 0);

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const performanceMultiplier = isWeekend ? 1.8 : 1.0;

    // Iterate over approved ads
    const activeAds = await prisma.ad.findMany({ where: { status: 'approved' }, include: { adGroup: { include: { campaign: true } } } });

    for (const ad of activeAds) {
      for (const pub of publishers) {
        // High-IVT Site (Publisher 4) special case
        const isSuspicious = pub.id === 4;
        
        let impsCount = Math.floor((Math.random() * 500 + 200) * performanceMultiplier);
        if (ad.id === 6) impsCount *= 2; // High imps for low CTR ad

        let clicksCount = Math.floor(impsCount * (isSuspicious ? 0.25 : 0.05)); // High CTR for IVT site
        if (ad.id === 6) clicksCount = Math.floor(Math.random() * 2); // Extremely low CTR

        // For Campaign 4, today, hit the daily budget limit
        if (ad.adGroup.campaign_id === 4 && i === 6) {
          clicksCount = 10; // 10 * 120 = 1200 (Over 1000 daily budget)
        }

        // Create Impressions
        await prisma.impression.createMany({
          data: Array.from({ length: impsCount }).map(() => ({
            ad_id: ad.id,
            publisher_id: pub.id,
            user_agent: 'Mozilla/5.0...',
            ip_address: isSuspicious ? `10.0.0.${Math.floor(Math.random() * 255)}` : '127.0.0.1',
            created_at: date
          }))
        });

        // Create Clicks
        for (let j = 0; j < clicksCount; j++) {
          const isValid = isSuspicious ? (Math.random() > 0.8 ? 1 : 0) : 1;
          const cost = ad.adGroup.max_bid;
          const earnings = cost * pub.rev_share;

          await prisma.click.create({
            data: {
              ad_id: ad.id,
              publisher_id: pub.id,
              campaign_id: ad.adGroup.campaign_id,
              cost: cost,
              publisher_earnings: earnings,
              is_valid: isValid,
              processed: 1,
              invalid_reason: isValid ? null : 'Suspicious traffic pattern',
              user_agent: isSuspicious ? 'Bot/1.0' : 'Mozilla/5.0...',
              ip_address: isSuspicious ? `10.0.0.${Math.floor(Math.random() * 255)}` : '127.0.0.1',
              created_at: date
            }
          });
        }
      }
    }
  }

  // 7. Payout Requests
  await prisma.payout.createMany({
    data: [
      { publisher_id: 1, amount: 50000, status: 'paid', created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), paid_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000) },
      { publisher_id: 1, amount: 75000, status: 'pending', created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
      { publisher_id: 2, amount: 20000, status: 'pending', created_at: now },
    ]
  });

  console.log('✅ Bustling ad network seeded successfully!');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
