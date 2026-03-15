import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding realistic anomaly data with Prisma...');

  // 1. Clear existing data
  await prisma.click.deleteMany();
  await prisma.impression.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.adGroupTargetPublisher.deleteMany();
  await prisma.adSchedule.deleteMany();
  await prisma.adGroup.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.publisher.deleteMany();
  await prisma.advertiser.deleteMany();
  await prisma.user.deleteMany();

  // 2. Users (Password: "password123")
  const passwordHash = bcrypt.hashSync('password123', 10);

  // 3. Advertisers & Their Users
  const advertisersData = [
    { id: 1, name: 'NovaTech Electronics', balance: 250000 },
    { id: 2, name: 'Luxe Global Travel', balance: 120000 },
    { id: 3, name: 'Organic Life Market', balance: 100 }, // Extremely low to trigger alert
    { id: 4, name: 'Budget Strapped Inc', balance: 5000 },
    { id: 5, name: 'Anomaly Testing Corp', balance: 50000 }, // For CTR/IVT testing
  ];

  for (const a of advertisersData) {
    await prisma.advertiser.create({
      data: { id: a.id, name: a.name, balance: a.balance }
    });
    await prisma.user.create({
      data: {
        email: `adv${a.id}@example.com`,
        password_hash: passwordHash,
        role: 'advertiser',
        linked_id: a.id,
      }
    });
  }

  // 4. Publishers & Their Users
  const publishersData = [
    { id: 1, name: 'The Daily Herald', domain: 'dailyherald.com', rev_share: 0.7 },
    { id: 2, name: 'TechCruncher Blog', domain: 'techcruncher.io', rev_share: 0.8 },
    { id: 3, name: 'Modern Kitchen Recipes', domain: 'modernkitchen.net', rev_share: 0.65 },
  ];

  for (const p of publishersData) {
    await prisma.publisher.create({
      data: { id: p.id, name: p.name, domain: p.domain, rev_share: p.rev_share }
    });
    await prisma.user.create({
      data: {
        email: `pub${p.id}@example.com`,
        password_hash: passwordHash,
        role: 'publisher',
        linked_id: p.id,
      }
    });
  }

  // 5. Admin user
  await prisma.user.create({
    data: { email: 'admin@adnetwork.local', password_hash: passwordHash, role: 'admin' }
  });

  // 6. Campaigns
  const campaignsData = [
    { id: 1, advertiser_id: 1, name: 'Summer Smartphone Launch', budget: 100000, spent: 45000, daily_budget: 0 },
    { id: 2, advertiser_id: 2, name: 'European Getaway 2026', budget: 80000, spent: 12000, daily_budget: 5000 },
    { id: 3, advertiser_id: 3, name: 'Spring Organic Fair', budget: 20000, spent: 19500, daily_budget: 1000 }, // Near total budget
    { id: 4, advertiser_id: 4, name: 'Daily Budget Test', budget: 50000, spent: 10000, daily_budget: 500 }, // Near daily budget
    { id: 5, advertiser_id: 5, name: 'Low CTR Anomaly Campaign', budget: 100000, spent: 5000, daily_budget: 0 },
  ];

  for (const c of campaignsData) {
    await prisma.campaign.create({
      data: {
        id: c.id,
        advertiser_id: c.advertiser_id,
        name: c.name,
        budget: c.budget,
        spent: c.spent,
        daily_budget: c.daily_budget,
        start_date: new Date('2026-01-01T00:00:00Z'),
      }
    });
  }

  // 7. Ad Groups
  const adGroupsData = [
    { id: 1, campaign_id: 1, name: 'Tech Enthusiasts', max_bid: 120, target_device: 'mobile' },
    { id: 2, campaign_id: 2, name: 'Luxury Travelers', max_bid: 250, target_device: 'desktop' },
    { id: 3, campaign_id: 3, name: 'Healthy Eaters', max_bid: 85, target_device: 'all' },
    { id: 4, campaign_id: 4, name: 'Budget Seekers', max_bid: 50, target_device: 'all' },
    { id: 5, campaign_id: 5, name: 'Invisible Ad Group', max_bid: 100, target_device: 'all' },
  ];

  for (const g of adGroupsData) {
    await prisma.adGroup.create({
      data: { id: g.id, campaign_id: g.campaign_id, name: g.name, max_bid: g.max_bid, target_device: g.target_device, is_all_publishers: 1 }
    });
  }

  // 8. Ads
  const adsData = [
    { id: 1, ad_group_id: 1, title: 'NovaPhone 15 Pro', image_url: '/images/1.jpeg', target_url: 'https://ex.com/1', status: 'approved' },
    { id: 2, ad_group_id: 2, title: 'Paris Getaway', image_url: '/images/2.jpeg', target_url: 'https://ex.com/2', status: 'approved' },
    { id: 3, ad_group_id: 3, title: 'Organic Carrots', image_url: '/images/3.jpeg', target_url: 'https://ex.com/3', status: 'approved' },
    { id: 4, ad_group_id: 4, title: 'Budget Plan', image_url: '/images/1.jpeg', target_url: 'https://ex.com/4', status: 'approved' },
    { id: 5, ad_group_id: 5, title: 'Ultra Low CTR Ad', image_url: '/images/5.jpeg', target_url: 'https://ex.com/5', status: 'approved' },
    { id: 6, ad_group_id: 1, title: 'Rejected Gadget', image_url: '/images/6.jpeg', target_url: 'https://ex.com/6', status: 'rejected', rejection_reason: 'Inappropriate content' },
  ];

  for (const ad of adsData) {
    await prisma.ad.create({ data: ad });
  }

  const now = new Date();

  // 9. Low CTR Anomaly Data (Ad ID 5)
  console.log('📉 Generating Low CTR anomaly data...');
  for (let i = 0; i < 1000; i++) {
    await prisma.impression.create({
      data: { ad_id: 5, publisher_id: 1, created_at: new Date(now.getTime() - i * 60 * 1000) }
    });
  }
  // Only 2 clicks for 1000 imps (0.2% CTR)
  for (let i = 0; i < 2; i++) {
    await prisma.click.create({
      data: { ad_id: 5, publisher_id: 1, is_valid: 1, processed: 1, cost: 100, created_at: now }
    });
  }

  // 10. High IVT Anomaly Data (Admin Insight #64)
  console.log('🚨 Generating High IVT anomaly data...');
  for (let i = 0; i < 100; i++) {
    const isValid = i < 20; // 80% IVT rate
    await prisma.click.create({
      data: {
        ad_id: 1,
        publisher_id: 2,
        is_valid: isValid ? 1 : 0,
        processed: 1,
        invalid_reason: isValid ? null : 'Bot detected',
        user_agent: 'Bot/1.0',
        ip_address: `192.168.1.${i}`,
        created_at: new Date(now.getTime() - i * 2 * 60 * 1000)
      }
    });
  }

  // 11. Daily Budget Near Limit (Campaign 4)
  console.log('💰 Generating Daily Budget usage data...');
  for (let i = 0; i < 9; i++) { // 9 * 50 = 450 (90% of 500)
    await prisma.click.create({
      data: {
        ad_id: 4,
        publisher_id: 3,
        is_valid: 1,
        processed: 1,
        cost: 50,
        created_at: now
      }
    });
  }

  console.log('✅ Anomaly seeding completed!');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
