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
  console.log('🌟 Seeding the ultimate "Alive" Ad Network dataset...');

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

  // 2. Advertisers
  const advertisersData = [
    { id: 1, name: 'Bandai Character Shop', balance: 1500000 },
    { id: 2, name: 'Small Startup', balance: 800 }, // Low Balance Alert
    { id: 3, name: 'Fashion ODM', balance: 200000 },
  ];
  for (const a of advertisersData) {
    await prisma.advertiser.create({ data: { id: a.id, name: a.name, balance: a.balance } });
    await prisma.user.create({ data: { email: `adv${a.id}@example.com`, password_hash: passwordHash, role: 'advertiser', linked_id: a.id } });
  }

  // 3. Publishers
  const publishersData = [
    { id: 1, name: 'Anime News Portal', domain: 'animenews.com', rev_share: 0.7, balance: 125000 },
    { id: 2, name: 'Gaming Hub', domain: 'gamerhub.jp', rev_share: 0.8, balance: 45000 },
  ];
  for (const p of publishersData) {
    await prisma.publisher.create({ data: p });
    await prisma.user.create({ data: { email: `pub${p.id}@example.com`, password_hash: passwordHash, role: 'publisher', linked_id: p.id } });
  }

  // 4. Admin
  await prisma.user.create({ data: { email: 'admin@adnetwork.local', password_hash: passwordHash, role: 'admin' } });

  // 5. Campaigns, AdGroups, Ads
  await prisma.campaign.create({ data: { id: 1, advertiser_id: 1, name: 'Chiikawa Festival', budget: 1000000, daily_budget: 50000, spent: 450000 } });
  await prisma.adGroup.create({ data: { id: 1, campaign_id: 1, name: 'Main Visual', max_bid: 150 } });
  
  // Approved Ads
  await prisma.ad.create({ data: { id: 1, ad_group_id: 1, title: 'ちいかわマーケットOPEN!', image_url: IMAGES[0], target_url: 'https://ex.com/1', status: 'approved' } });
  await prisma.ad.create({ data: { id: 2, ad_group_id: 1, title: 'ハチワレのぬいぐるみ予約中', image_url: IMAGES[1], target_url: 'https://ex.com/2', status: 'approved' } });
  
  // Pending Ads (Review Queue)
  await prisma.ad.create({ data: { id: 3, ad_group_id: 1, title: '【新商品】うさぎのキーホルダー', image_url: IMAGES[2], target_url: 'https://ex.com/3', status: 'pending' } });
  await prisma.ad.create({ data: { id: 4, ad_group_id: 1, title: 'モモンガのクッション', image_url: IMAGES[3], target_url: 'https://ex.com/4', status: 'pending' } });

  // Campaign for Anomaly
  await prisma.campaign.create({ data: { id: 2, advertiser_id: 1, name: 'Ghost Campaign', budget: 100000, spent: 5000 } });
  await prisma.adGroup.create({ data: { id: 2, campaign_id: 2, name: 'Unpopular Group', max_bid: 50 } });
  await prisma.ad.create({ data: { id: 5, ad_group_id: 2, title: '誰もクリックしない広告', image_url: IMAGES[6], target_url: 'https://ex.com/5', status: 'approved' } });

  // 6. Generate Bustling Historical Data (Last 7 Days)
  console.log('📈 Generating complex time-series data...');
  const now = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    date.setUTCHours(12, 0, 0, 0);

    const isToday = i === 6;
    const baseCount = (i + 1) * 50; // Increasing trend

    for (const pub of publishersData) {
      const impsCount = baseCount + Math.floor(Math.random() * 20);
      const clicksCount = Math.floor(impsCount * 0.1);

      // Create Impressions
      await prisma.impression.createMany({
        data: Array.from({ length: impsCount }).map(() => ({
          ad_id: 1, publisher_id: pub.id, user_agent: 'Mozilla/5.0...', ip_address: '127.0.0.1', created_at: date
        }))
      });

      // Create Valid, Processed Clicks (Historical & Today's baseline)
      for (let j = 0; j < clicksCount; j++) {
        const cost = 150;
        const earnings = cost * pub.rev_share;
        await prisma.click.create({
          data: {
            ad_id: 1, publisher_id: pub.id, campaign_id: 1, cost, publisher_earnings: earnings,
            is_valid: 1, processed: 1, created_at: date
          }
        });
      }

      // Low CTR Anomaly Data
      await prisma.impression.createMany({
        data: Array.from({ length: 200 }).map(() => ({
          ad_id: 5, publisher_id: pub.id, user_agent: '...', ip_address: '127.0.0.1', created_at: date
        }))
      });
    }
  }

  // 7. Click Validation Queue (Unprocessed Clicks)
  console.log('💰 Adding unprocessed clicks for validation queue...');
  await prisma.click.createMany({
    data: [
      { ad_id: 1, publisher_id: 1, user_agent: 'Mozilla/5.0...', ip_address: '192.168.1.100', processed: 0, created_at: now },
      { ad_id: 2, publisher_id: 2, user_agent: 'Mozilla/5.0...', ip_address: '192.168.1.101', processed: 0, created_at: now },
      { ad_id: 1, publisher_id: 1, user_agent: 'Bot/1.0', ip_address: '10.0.0.50', processed: 0, created_at: now },
    ]
  });

  // 8. Payout Requests Queue (Pending Payouts)
  console.log('💸 Adding pending payout requests...');
  await prisma.payout.createMany({
    data: [
      { publisher_id: 1, amount: 50000, status: 'pending', created_at: now },
      { publisher_id: 2, amount: 15000, status: 'pending', created_at: now },
      { publisher_id: 1, amount: 25000, status: 'paid', created_at: new Date(now.getTime() - 86400000 * 5), paid_at: new Date(now.getTime() - 86400000 * 4) },
    ]
  });

  console.log('✅ "Alive" dataset seeded successfully!');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
