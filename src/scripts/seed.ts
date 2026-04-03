import { PrismaClient, EntityStatus } from "../../prisma/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./adnetwork.db",
});

const prisma = new PrismaClient({ adapter });

// ローカルに保存した画像パス（外部URLタイムアウト対策）
const IMAGES = [
  "/uploads/ads/chiikawa.jpg",
  "/uploads/ads/kodansha.jpg",
  "/uploads/ads/odm1.jpg",
  "/uploads/ads/budget.jpg",
  "/uploads/ads/odm2.jpg",
  "/uploads/ads/ameba.jpg",
  "/uploads/ads/amazon.jpg"
];

async function seed() {
  console.log('🌟 Seeding for Publisher Hierarchy (Apps & Ad Units)...');

  // 1. Clear everything
  await prisma.$transaction([
    prisma.conversion.deleteMany(),
    prisma.conversionRule.deleteMany(),
    prisma.click.deleteMany(),
    prisma.impression.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.ad.deleteMany(),
    prisma.adSchedule.deleteMany(),
    prisma.adGroupTargetPublisher.deleteMany(),
    prisma.adGroup.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.adUnit.deleteMany(),
    prisma.app.deleteMany(),
    prisma.publisher.deleteMany(),
    prisma.advertiser.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 2. Advertisers
  const advertisers = [
    { id: 1, name: 'Healthy Corp (Normal)', balance: 10000000 }, // 残高1000万！大富豪！💰
    { id: 2, name: 'Struggling Shop (Warning)', balance: 3500 },
    { id: 3, name: 'Broke Startup (Error)', balance: 450 },
  ];
  for (const a of advertisers) {
    await prisma.advertiser.create({ data: a });
    await prisma.user.create({ data: { email: `adv${a.id}@example.com`, password_hash: passwordHash, role: 'advertiser', linked_id: a.id } });
  }

  // 3. Publishers
  const publishers = [
    { id: 1, name: 'Growth Media Group', balance: 80000, category: 'anime' },
    { id: 2, name: 'Declining Blog Network', balance: 15000, category: 'game' },
    { id: 3, name: 'New Tech Startup', balance: 0, category: 'tech' },
  ];
  for (const p of publishers) {
    await prisma.publisher.create({ data: p });
    await prisma.user.create({ data: { email: `pub${p.id}@example.com`, password_hash: passwordHash, role: 'publisher', linked_id: p.id } });
  }

  // 3.1 Apps & Ad Units
  const apps = [
    { id: 1, publisher_id: 1, name: 'Anime World Blog', domain: 'animeworld.com', platform: 'web' },
    { id: 2, publisher_id: 2, name: 'Retro Game DB', domain: 'retrogame.jp', platform: 'web' },
    { id: 3, publisher_id: 3, name: 'Tech News App', bundle_id: 'com.technews.app', platform: 'ios' },
  ];
  for (const app of apps) {
    await prisma.app.create({ data: app });
  }

  const adUnits = [
    { id: 1, app_id: 1, name: 'Sidebar Banner', width: 300, height: 250 },
    { id: 2, app_id: 1, name: 'Bottom Leaderboard', width: 728, height: 90 },
    { id: 3, app_id: 2, name: 'Article Mid Banner', width: 300, height: 250 },
    { id: 4, app_id: 3, name: 'Mobile Interstitial', ad_type: 'interstitial' },
  ];
  for (const unit of adUnits) {
    await prisma.adUnit.create({ data: unit });
  }

  // 4. Admin
  await prisma.user.create({ data: { email: 'admin@adnetwork.local', password_hash: passwordHash, role: 'admin' } });

  // 5. Campaigns
  const campaigns = [
    { id: 1, advertiser_id: 1, name: 'Normal Campaign', budget: 100000, spent: 10000, daily_budget: 0 },
    { id: 2, advertiser_id: 1, name: 'Budget Warning', budget: 50000, spent: 47500, daily_budget: 0 },
    { id: 3, advertiser_id: 1, name: 'Budget Exceeded', budget: 20000, spent: 25000, daily_budget: 0 },
    { id: 4, advertiser_id: 1, name: 'Daily Budget Warning', budget: 500000, daily_budget: 1000, spent: 5000 },
    { id: 5, advertiser_id: 1, name: 'Daily Budget Exceeded', budget: 500000, daily_budget: 500, spent: 5000 },
    { id: 6, advertiser_id: 1, name: 'Low CTR Campaign', budget: 100000, spent: 1000, daily_budget: 0 },
  ];
  for (const c of campaigns) {
    await prisma.campaign.create({ data: c });
  }

  // 6. Ad Groups
  const categories = [null, 'anime', 'game', 'tech', 'lifestyle', 'business'];
  for (const c of campaigns) {
    await prisma.adGroup.create({ 
      data: { 
        id: c.id, 
        campaign_id: c.id, 
        name: `${c.name} Group`, 
        max_bid: 100,
        target_category: categories[c.id - 1] || null
      } 
    });
  }

  // 7. Ads
  const ads = [
    { id: 1, ad_group_id: 1, title: 'Approved Ad (Chiikawa)', review_status: 'approved', status: EntityStatus.ACTIVE, image_path: IMAGES[0], target_url: 'https://ex.com/1' },
    { id: 2, ad_group_id: 1, title: 'Pending Ad (Review)', review_status: 'pending', status: EntityStatus.ACTIVE, image_path: IMAGES[1], target_url: 'https://ex.com/2' },
    { id: 3, ad_group_id: 1, title: 'Rejected Ad (Violation)', review_status: 'rejected', status: EntityStatus.ACTIVE, rejection_reason: 'Copyright issue.', image_path: IMAGES[2], target_url: 'https://ex.com/3' },
    { id: 4, ad_group_id: 6, title: 'Low CTR Ad', review_status: 'approved', status: EntityStatus.ACTIVE, image_path: IMAGES[6], target_url: 'https://ex.com/4' },
    // Campaign 3 (Budget Exceeded) 用の広告 - 予算使い切れアラートをテストするため
    { id: 5, ad_group_id: 3, title: 'Budget Exceeded Ad', review_status: 'approved', status: EntityStatus.ACTIVE, image_path: IMAGES[3], target_url: 'https://ex.com/5' },
  ];
  for (const ad of ads) {
    await prisma.ad.create({ data: ad });
  }

  const now = new Date();

  // 8. Historical Data
  console.log('📈 Generating performance data...');
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    date.setUTCHours(12, 0, 0, 0);

    // Pub 1 (Unit 1): Increasing Trend - High Efficiency
    const pub1Count = (i + 1) * 100;
    await prisma.impression.createMany({ data: Array.from({ length: pub1Count }).map(() => ({ ad_id: 1, publisher_id: 1, ad_unit_id: 1, created_at: date })) });
    for (let j = 0; j < Math.floor(pub1Count * 0.15); j++) { // 15% CTR!
      await prisma.click.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 1, campaign_id: 1, cost: 150, publisher_earnings: 105, is_valid: 1, processed: 1, created_at: date } });
    }

    // Pub 1 (Unit 2): Bottom Leaderboard - Lower CTR
    const pub1Unit2Count = 200;
    await prisma.impression.createMany({ data: Array.from({ length: pub1Unit2Count }).map(() => ({ ad_id: 1, publisher_id: 1, ad_unit_id: 2, created_at: date })) });
    for (let j = 0; j < Math.floor(pub1Unit2Count * 0.02); j++) { // 2% CTR
      await prisma.click.create({ data: { ad_id: 1, publisher_id: 1, ad_unit_id: 2, campaign_id: 1, cost: 100, publisher_earnings: 70, is_valid: 1, processed: 1, created_at: date } });
    }

    // Pub 2 (Unit 3): Article Mid - Average
    const pub2Count = (7 - i) * 100;
    await prisma.impression.createMany({ data: Array.from({ length: pub2Count }).map(() => ({ ad_id: 1, publisher_id: 2, ad_unit_id: 3, created_at: date })) });
    for (let j = 0; j < Math.floor(pub2Count * 0.05); j++) { // 5% CTR
      await prisma.click.create({ data: { ad_id: 1, publisher_id: 2, ad_unit_id: 3, campaign_id: 1, cost: 120, publisher_earnings: 96, is_valid: 1, processed: 1, created_at: date } });
    }
  }

  // 12. Conversion Data
  console.log('🎯 Generating conversion data...');
  const clickId1 = crypto.randomUUID();
  await prisma.click.create({
    data: { click_id: clickId1, ad_id: 1, publisher_id: 1, ad_unit_id: 1, campaign_id: 1, cost: 100, is_valid: 1, created_at: now }
  });

  const rule1 = await prisma.conversionRule.create({
    data: { advertiser_id: 1, name: 'Purchase', url_pattern: '/purchase', label: 'macro', revenue: 5000 }
  });

  await prisma.conversion.create({
    data: { click_id: clickId1, rule_id: rule1.id, revenue: 5000, created_at: now }
  });

  console.log('📱 Seeding for OS Targeting Test Data...');

  // 13. OS Targeting Test Publisher & Ad Unit
  const osTestPub = await prisma.publisher.create({
    data: { id: 10, name: 'OS Test Publisher', category: 'tech', balance: 0 }
  });
  const osTestApp = await prisma.app.create({
    data: { id: 10, publisher_id: osTestPub.id, name: 'OS Test App', domain: 'ostest.com', platform: 'web' }
  });
  const osTestUnit = await prisma.adUnit.create({
    data: { id: 100, app_id: osTestApp.id, name: 'OS Targeting Preview Unit', width: 300, height: 250 }
  });

  // 14. OS Targeting Test Campaign
  const osCampaign = await prisma.campaign.create({
    data: { id: 100, advertiser_id: 1, name: 'OS Targeting Test', budget: 1000000, daily_budget: 0 }
  });

  // 15. OS Targeting Ad Groups & Ads
  const osTargets = [
    { name: 'iOS Only', os: ['iOS'], img: '/images/ios.jpeg', id: 101 },
    { name: 'Android Only', os: ['Android'], img: '/images/android.jpg', id: 102 },
    { name: 'macOS Only', os: ['macOS'], img: '/images/mac.jpeg', id: 103 },
    { name: 'Other Only', os: ['Other'], img: '/images/other.png', id: 104 },
  ];

  for (const target of osTargets) {
    const group = await prisma.adGroup.create({
      data: {
        id: target.id,
        campaign_id: osCampaign.id,
        name: target.name,
        max_bid: 10000, // 1万に設定！これでもスコア100だから最強だよっ！💰🔥
        targeting: JSON.stringify({ os: target.os }),
        is_all_publishers: 1
      }
    });

    await prisma.ad.create({
      data: {
        id: target.id,
        ad_group_id: group.id,
        title: `${target.name} Ad`,
        description: `This ad should only appear on ${target.os.join(', ')} devices.`,
        image_path: target.img,
        target_url: 'https://example.com/os-test',
        review_status: 'approved',
        status: 'ACTIVE'
      }
    });
  }

  // 16. Alert Test Data - 4種類のアラートを確認できるデータ
  console.log('🚨 Seeding alert test data...');
  
  // 1️⃣ NO_ADS_IN_CAMPAIGN: ACTIVEなキャンペーンだが広告なし
  const noAdsCampaign = await prisma.campaign.create({
    data: { 
      id: 110, 
      advertiser_id: 1, 
      name: '🔴 No Ads Campaign', 
      budget: 50000, 
      spent: 0, 
      daily_budget: 1000,
      status: 'ACTIVE'
    }
  });
  // 広告グループはあるが、広告は作成しない
  await prisma.adGroup.create({
    data: {
      id: 110,
      campaign_id: noAdsCampaign.id,
      name: 'Empty AdGroup (No Ads)',
      max_bid: 100,
      status: 'ACTIVE'
    }
  });

  // 2️⃣ PARENT_PAUSED: ACTIVEなキャンペーンだがAdGroupがPAUSED
  const parentPausedCampaign = await prisma.campaign.create({
    data: { 
      id: 111, 
      advertiser_id: 1, 
      name: '🔴 Parent Active but Group Paused', 
      budget: 50000, 
      spent: 0, 
      daily_budget: 1000,
      status: 'ACTIVE'
    }
  });
  const pausedAdGroup = await prisma.adGroup.create({
    data: {
      id: 111,
      campaign_id: parentPausedCampaign.id,
      name: 'Paused AdGroup',
      max_bid: 100,
      status: 'PAUSED' // これがPAUSED！
    }
  });
  // 広告は作成するが、AdGroupがPAUSEDなので配信されない
  await prisma.ad.create({
    data: {
      id: 110,
      ad_group_id: pausedAdGroup.id,
      title: 'Ad in Paused Group',
      target_url: 'https://example.com/paused',
      review_status: 'approved',
      status: 'ACTIVE',
      image_path: IMAGES[0]
    }
  });

  // 3️⃣ NO_BUDGET: 予算未設定（budget=0, daily_budget=0）
  const noBudgetCampaign = await prisma.campaign.create({
    data: { 
      id: 112, 
      advertiser_id: 1, 
      name: '🟡 No Budget Set', 
      budget: 0, // 予算未設定！
      spent: 0, 
      daily_budget: 0, // 日次予算も未設定！
      status: 'ACTIVE'
    }
  });
  const noBudgetAdGroup = await prisma.adGroup.create({
    data: {
      id: 112,
      campaign_id: noBudgetCampaign.id,
      name: 'AdGroup with Budget Issue',
      max_bid: 100,
      status: 'ACTIVE'
    }
  });
  // 広告はあるのでNO_ADSアラートは出ない
  await prisma.ad.create({
    data: {
      id: 111,
      ad_group_id: noBudgetAdGroup.id,
      title: 'Ad without Budget',
      target_url: 'https://example.com/nobudget',
      review_status: 'approved',
      status: 'ACTIVE',
      image_path: IMAGES[1]
    }
  });

  // 4️⃣ BUDGET_EXHAUSTED: 予算使い切れ（spent >= budget）
  const exhaustedCampaign = await prisma.campaign.create({
    data: { 
      id: 113, 
      advertiser_id: 1, 
      name: '🟡 Budget Exhausted', 
      budget: 10000, // 予算1万円
      spent: 10000,  // 使い切った！
      daily_budget: 1000,
      status: 'ACTIVE'
    }
  });
  const exhaustedAdGroup = await prisma.adGroup.create({
    data: {
      id: 113,
      campaign_id: exhaustedCampaign.id,
      name: 'AdGroup with Exhausted Budget',
      max_bid: 100,
      status: 'ACTIVE'
    }
  });
  await prisma.ad.create({
    data: {
      id: 112,
      ad_group_id: exhaustedAdGroup.id,
      title: 'Ad with No Budget Left',
      target_url: 'https://example.com/exhausted',
      review_status: 'approved',
      status: 'ACTIVE',
      image_path: IMAGES[2]
    }
  });

  console.log('✅ Seeding completed!');
  console.log('');
  console.log('🎯 アラート確認用データ:');
  console.log('  1. 🔴 NO_ADS_IN_CAMPAIGN: "🔴 No Ads Campaign"');
  console.log('  2. 🔴 PARENT_PAUSED: "🔴 Parent Active but Group Paused"');
  console.log('  3. 🟡 NO_BUDGET: "🟡 No Budget Set"');
  console.log('  4. 🟡 BUDGET_EXHAUSTED: "🟡 Budget Exhausted"');
  console.log('');
  console.log('   → Advertiser Dashboard (ID: 1) で確認できます！');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
