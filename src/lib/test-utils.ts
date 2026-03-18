import prisma from './db';

export async function clearDatabase() {
  await prisma.conversion.deleteMany();
  await prisma.conversionRule.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.click.deleteMany();
  await prisma.impression.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.adGroupTargetPublisher.deleteMany();
  await prisma.adSchedule.deleteMany();
  await prisma.adGroup.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.adUnit.deleteMany();
  await prisma.app.deleteMany();
  await prisma.publisher.deleteMany();
  await prisma.advertiser.deleteMany();
  await prisma.user.deleteMany();

  // Reset auto-increment counters for SQLite
  await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence");
}
