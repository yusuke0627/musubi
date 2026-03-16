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
  console.log('🌟 Seeding for Branch Coverage (UI Test Data)...');

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

  // 2. Advertisers (Triggering balance branches)
  const advertisers = [
    { id: 1, name: 'Healthy Corp (Normal)', balance: 500000 },
    { id: 2, name: 'Struggling Shop (Warning: <5000)', balance: 3500 },
    { id: 3, name: 'Broke Startup (Error: <1000)', balance: 450 },
  ];
  for (const a of advertisers) {
    await prisma.advertiser.create({ data: a });
    await prisma.user.create({ data: { email: `adv${a.id}@example.com`, password_hash: passwordHash, role: 'advertiser', linked_id: a.id } });
  }

  // 3. Publishers (Triggering trend branches)
  const publishers = [
    { id: 1, name: 'Growth Media (Up Trend)', domain: 'growth.com', rev_share: 0.7, balance: 80000 },
    { id: 2, name: 'Declining Blog (Down Trend)', domain: 'decline.jp', rev_share: 0.8, balance: 15000 },
    { id: 3, name: 'New Publisher (No stats)', domain: 'new.net', rev_share: 0.6, balance: 0 },
  ];
  for (const p of publishers) {
    await prisma.publisher.create({ data: p });
    await prisma.user.create({ data: { email: `pub${p.id}@example.com`, password_hash: passwordHash, role: 'publisher', linked_id: p.id } });
  }

  // 4. Admin
  await prisma.user.create({ data: { email: 'admin@adnetwork.local', password_hash: passwordHash, role: 'admin' } });

  // 5. Campaigns (Triggering budget branches)
  const campaigns = [
    { id: 1, advertiser_id: 1, name: 'Normal Campaign', budget: 100000, spent: 10000, daily_budget: 0 },
    { id: 2, advertiser_id: 1, name: 'Total Budget Warning (>90%)', budget: 50000, spent: 96000, daily_budget: 0 }, // Wait, spent > budget is Error
    { id: 3, advertiser_id: 1, name: 'Total Budget Error (Exceeded)', budget: 20000, spent: 25000, daily_budget: 0 },
    { id: 4, advertiser_id: 1, name: 'Daily Budget Warning (>90%)', budget: 500000, daily_budget: 1000, spent: 5000 },
    { id: 5, advertiser_id: 1, name: 'Daily Budget Error (Exceeded)', budget: 500000, daily_budget: 500, spent: 5000 },
    { id: 6, advertiser_id: 1, name: 'Low CTR Campaign (Anomaly)', budget: 100000, spent: 1000, daily_budget: 0 },
  ];
  // Correcting ID 2 to be exactly Warning
  campaigns[1].spent = campaigns[1].budget * 0.95;

  for (const c of campaigns) {
    await prisma.campaign.create({ data: c });
  }

  // 6. Ad Groups
  for (const c of campaigns) {
    await prisma.adGroup.create({ data: { id: c.id, campaign_id: c.id, name: `${c.name} Group`, max_bid: 100 } });
  }

  // 7. Ads (Triggering status branches)
  const ads = [
    { id: 1, ad_group_id: 1, title: 'Approved Ad (Chiikawa)', status: 'approved', image_url: IMAGES[0], target_url: 'https://ex.com/1' },
    { id: 2, ad_group_id: 1, title: 'Pending Ad (Review Required)', status: 'pending', image_url: IMAGES[1], target_url: 'https://ex.com/2' },
    { id: 3, ad_group_id: 1, title: 'Rejected Ad (Policy Violation)', status: 'rejected', rejection_reason: '画像の著作権侵害の疑いがあります。', image_url: IMAGES[2], target_url: 'https://ex.com/3' },
    { id: 4, ad_group_id: 6, title: 'Low CTR Ad (Ghost)', status: 'approved', image_url: IMAGES[6], target_url: 'https://ex.com/4' },
  ];
  for (const ad of ads) {
    await prisma.ad.create({ data: ad });
  }

  const now = new Date();

  // 8. Historical Data Generation
  console.log('📈 Generating performance data for trend analysis...');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    date.setUTCHours(12, 0, 0, 0);

    const isToday = i === 6;

    // Publisher 1: Increasing Trend (Up Arrow)
    const pub1Count = (i + 1) * 100;
    await prisma.impression.createMany({ data: Array.from({ length: pub1Count }).map(() => ({ ad_id: 1, publisher_id: 1, created_at: date })) });
    for (let j = 0; j < Math.floor(pub1Count * 0.1); j++) {
      await prisma.click.create({ data: { ad_id: 1, publisher_id: 1, campaign_id: 1, cost: 100, publisher_earnings: 70, is_valid: 1, processed: 1, created_at: date } });
    }

    // Publisher 2: Decreasing Trend (Down Arrow)
    const pub2Count = (7 - i) * 100;
    await prisma.impression.createMany({ data: Array.from({ length: pub2Count }).map(() => ({ ad_id: 1, publisher_id: 2, created_at: date })) });
    for (let j = 0; j < Math.floor(pub2Count * 0.1); j++) {
      await prisma.click.create({ data: { ad_id: 1, publisher_id: 2, campaign_id: 1, cost: 100, publisher_earnings: 80, is_valid: 1, processed: 1, created_at: date } });
    }

    // Ad 4: Low CTR Anomaly
    await prisma.impression.createMany({ data: Array.from({ length: 500 }).map(() => ({ ad_id: 4, publisher_id: 1, created_at: date })) });
    // Only 1 click for 500 imps (0.2% CTR)
    await prisma.click.create({ data: { ad_id: 4, publisher_id: 1, campaign_id: 6, cost: 50, publisher_earnings: 35, is_valid: 1, processed: 1, created_at: date } });

    // Daily Budget Logic for Today
    if (isToday) {
      // Campaign 4: Daily Warning (950 / 1000)
      for (let j = 0; j < 19; j++) {
        await prisma.click.create({ data: { ad_id: 1, publisher_id: 3, campaign_id: 4, cost: 50, publisher_earnings: 30, is_valid: 1, processed: 1, created_at: date } });
      }
      // Campaign 5: Daily Error (1100 / 500)
      for (let j = 0; j < 11; j++) {
        await prisma.click.create({ data: { ad_id: 1, publisher_id: 3, campaign_id: 5, cost: 100, publisher_earnings: 60, is_valid: 1, processed: 1, created_at: date } });
      }
    }
  }

  // 9. Admin Queue Data (Branch: Has Pending Items)
  console.log('💰 Adding queue items for admin workflow coverage...');
  await prisma.click.createMany({
    data: [
      { ad_id: 1, publisher_id: 1, processed: 0, created_at: now },
      { ad_id: 1, publisher_id: 2, processed: 0, created_at: now },
    ]
  });

  await prisma.payout.createMany({
    data: [
      { publisher_id: 1, amount: 5000, status: 'pending', created_at: now },
      { publisher_id: 2, amount: 12000, status: 'paid', created_at: new Date(now.getTime() - 86400000), paid_at: now },
    ]
  });

  // 10. Admin Anomaly: High IVT Rate (Branch: >20%)
  console.log('🚨 Generating High IVT anomaly...');
  for (let i = 0; i < 50; i++) {
    const isValid = i < 10; // 80% IVT
    await prisma.click.create({
      data: {
        ad_id: 1, publisher_id: 3, cost: 0, is_valid: isValid ? 1 : 0, processed: 1, 
        invalid_reason: isValid ? null : 'Suspicious traffic', user_agent: 'Bot/1.0', created_at: now
      }
    });
  }

  // 11. Admin Anomaly: Network Drop (Branch: <50% of prev 24h)
  console.log('📉 Generating Network Drop anomaly...');
  const yesterday = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 172800000);
  // Previous 24h: High activity
  await prisma.impression.createMany({ data: Array.from({ length: 500 }).map(() => ({ ad_id: 1, publisher_id: 1, created_at: twoDaysAgo })) });
  // Current 24h: Low activity (triggered drop alert)
  await prisma.impression.createMany({ data: Array.from({ length: 50 }).map(() => ({ ad_id: 1, publisher_id: 1, created_at: yesterday })) });

  console.log('✅ Branch Coverage Seeding completed!');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
