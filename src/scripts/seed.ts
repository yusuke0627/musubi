import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding realistic data with Prisma...');

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
    { id: 3, name: 'Organic Life Market', balance: 45000 },
  ];

  for (const a of advertisersData) {
    await prisma.advertiser.create({
      data: {
        id: a.id,
        name: a.name,
        balance: a.balance,
      }
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
      data: {
        id: p.id,
        name: p.name,
        domain: p.domain,
        rev_share: p.rev_share,
      }
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
    data: {
      email: 'admin@adnetwork.local',
      password_hash: passwordHash,
      role: 'admin',
    }
  });

  // 6. Campaigns
  const campaignsData = [
    { id: 1, advertiser_id: 1, name: 'Summer Smartphone Launch', budget: 100000 },
    { id: 2, advertiser_id: 2, name: 'European Getaway 2026', budget: 80000 },
    { id: 3, advertiser_id: 3, name: 'Spring Organic Fair', budget: 20000 },
  ];

  for (const c of campaignsData) {
    await prisma.campaign.create({
      data: {
        id: c.id,
        advertiser_id: c.advertiser_id,
        name: c.name,
        budget: c.budget,
        start_date: new Date('2026-01-01T00:00:00Z'),
      }
    });
  }

  // 7. Ad Groups
  const adGroupsData = [
    { id: 1, campaign_id: 1, name: 'Tech Enthusiasts (Mobile)', max_bid: 120, target_device: 'mobile' },
    { id: 2, campaign_id: 2, name: 'Luxury Travelers (Desktop)', max_bid: 250, target_device: 'desktop' },
    { id: 3, campaign_id: 3, name: 'Healthy Eaters (All)', max_bid: 85, target_device: 'all' },
  ];

  for (const g of adGroupsData) {
    await prisma.adGroup.create({
      data: {
        id: g.id,
        campaign_id: g.campaign_id,
        name: g.name,
        max_bid: g.max_bid,
        target_device: g.target_device,
        is_all_publishers: 1,
      }
    });
  }

  // 8. Ads
  const adsData = [
    { id: 1, ad_group_id: 1, title: 'The New NovaPhone 15 Pro', description: 'Experience the future of mobile technology.', image_url: '/images/1.jpeg', target_url: 'https://example.com/novaphone', status: 'approved' },
    { id: 2, ad_group_id: 2, title: 'Unforgettable Paris nights', description: 'Book your luxury suite now and save 20%.', image_url: '/images/2.jpeg', target_url: 'https://example.com/paris', status: 'approved' },
    { id: 3, ad_group_id: 3, title: 'Fresh Greens, Every Day', description: '100% certified organic produce delivered.', image_url: '/images/3.jpeg', target_url: 'https://example.com/organic', status: 'approved' },
    { id: 4, ad_group_id: 1, title: 'NovaWatch Series 5', description: 'Track your health with precision.', image_url: '/images/4.png', target_url: 'https://example.com/novawatch', status: 'approved' },
    { id: 5, ad_group_id: 2, title: 'Tropical Island Escape', description: 'All-inclusive resorts starting at $199.', image_url: '/images/5.jpeg', target_url: 'https://example.com/island', status: 'approved' },
    { id: 6, ad_group_id: 1, title: 'NovaPad Air - Preorder Now', description: 'The thinnest tablet ever made.', image_url: '/images/6.jpeg', target_url: 'https://example.com/novapad', status: 'pending' },
    { id: 7, ad_group_id: 3, title: 'Vegan Meal Kits', description: 'Delicious recipes delivered to your door.', image_url: '/images/7.png', target_url: 'https://example.com/vegan', status: 'pending' },
  ];

  for (const ad of adsData) {
    await prisma.ad.create({
      data: ad
    });
  }

  // 9. Historical Data (Last 7 Days)
  console.log('📈 Generating historical stats...');
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0);

    for (const ad of adsData.filter(a => a.status === 'approved')) {
      for (const pub of publishersData) {
        const impsCount = Math.floor(Math.random() * 50) + 10;
        const clicksCount = Math.floor(impsCount * (Math.random() * 0.1));

        for (let j = 0; j < impsCount; j++) {
          await prisma.impression.create({
            data: {
              ad_id: ad.id,
              publisher_id: pub.id,
              user_agent: 'Mozilla/5.0...',
              ip_address: '127.0.0.1',
              created_at: date,
            }
          });
        }

        const group = adGroupsData.find(g => g.id === ad.ad_group_id);
        const cost = group?.max_bid || 0;

        for (let j = 0; j < clicksCount; j++) {
          await prisma.click.create({
            data: {
              ad_id: ad.id,
              publisher_id: pub.id,
              campaign_id: group?.campaign_id,
              cost: cost,
              user_agent: 'Mozilla/5.0...',
              ip_address: '127.0.0.1',
              is_valid: 1,
              processed: 1,
              created_at: date,
            }
          });
          // Update spent
          if (group?.campaign_id) {
            await prisma.campaign.update({
              where: { id: group.campaign_id },
              data: { spent: { increment: cost } }
            });
          }
        }
      }
    }
  }

  // 10. Pending Clicks for Billing
  console.log('💰 Adding pending clicks for billing...');
  await prisma.click.createMany({
    data: [
      { ad_id: 1, publisher_id: 1, user_agent: 'Mozilla/5.0...', ip_address: '192.168.1.5', processed: 0 },
      { ad_id: 2, publisher_id: 2, user_agent: 'Mozilla/5.0...', ip_address: '192.168.1.10', processed: 0 },
      { ad_id: 1, publisher_id: 3, user_agent: 'Mozilla/5.0...', ip_address: '10.0.0.1', processed: 0 },
    ]
  });

  // 11. Payout Data
  console.log('💸 Adding payout requests and history...');
  await prisma.payout.createMany({
    data: [
      { publisher_id: 1, amount: 5000, status: 'pending', created_at: new Date('2026-03-10T10:00:00Z') },
      { publisher_id: 2, amount: 12000, status: 'pending', created_at: new Date('2026-03-11T09:30:00Z') },
      { publisher_id: 1, amount: 3500, status: 'paid', created_at: new Date('2026-02-15T14:00:00Z'), paid_at: new Date('2026-02-16T10:00:00Z') },
      { publisher_id: 3, amount: 8200, status: 'paid', created_at: new Date('2026-03-01T11:00:00Z'), paid_at: new Date('2026-03-02T09:00:00Z') },
    ]
  });

  // 12. Final Balances Update
  await prisma.publisher.update({
    where: { id: 1 },
    data: { balance: { increment: 1500 }, total_earnings: { increment: 10000 } }
  });
  await prisma.publisher.update({
    where: { id: 2 },
    data: { balance: { increment: 2500 }, total_earnings: { increment: 15000 } }
  });

  console.log('✅ Seeding completed with Prisma!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
