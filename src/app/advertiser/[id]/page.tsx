import prisma from "@/lib/db";
import { getDailyStats, getPlacementStats } from "@/services/stats";
import { getAdvertiserInsights } from "@/services/insights";
import Link from "next/link";
import { notFound, forbidden } from "next/navigation";
import StatsChart from "@/components/StatsChart";
import AdsPerformanceTable from "@/components/AdsPerformanceTable";
import CampaignsTable from "@/components/CampaignsTable";
import AdGroupsTable from "@/components/AdGroupsTable";
import PlacementReportTable from "@/components/PlacementReportTable";
import InsightSection from "@/components/InsightSection";
import { createCampaign, createAdGroup, createAd } from "./actions";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdvertiserDashboard({ params }: PageProps) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  const session = await auth();
  const user = session?.user as any;

  // Authorization check (IDOR Protection)
  if (user?.role !== 'admin' && (user?.role !== 'advertiser' || user?.linked_id !== id)) {
    return forbidden();
  }

  const advertiser = await prisma.advertiser.findUnique({
    where: { id }
  });

  if (!advertiser) return notFound();

  const advertiserInsights = await getAdvertiserInsights(id);

  // キャンペーン一覧の取得
  const campaigns = await prisma.campaign.findMany({
    where: { advertiser_id: id }
  });
  
  // アドグループ一覧の取得 (キャンペーン名を含む)
  const adGroupsRaw = await prisma.adGroup.findMany({
    where: { campaign: { advertiser_id: id } },
    include: { campaign: { select: { name: true } } }
  });
  const adGroups = adGroupsRaw.map(g => ({
    ...g,
    campaign_name: g.campaign.name
  }));

  // 広告成果一覧の取得
  const adsRaw = await prisma.ad.findMany({
    where: { adGroup: { campaign: { advertiser_id: id } } },
    include: {
      adGroup: {
        include: {
          campaign: true
        }
      },
      _count: {
        select: {
          impressions: true,
          clicks: {
            where: { is_valid: 1 }
          }
        }
      }
    },
    orderBy: { id: 'desc' }
  });

  const ads = adsRaw.map(ad => ({
    ...ad,
    group_name: ad.adGroup.name,
    max_bid: ad.adGroup.max_bid,
    target_device: ad.adGroup.target_device,
    campaign_name: ad.adGroup.campaign.name,
    campaign_id: ad.adGroup.campaign.id,
    start_date: ad.adGroup.campaign.start_date,
    end_date: ad.adGroup.campaign.end_date,
    campaign_budget: ad.adGroup.campaign.budget,
    impressions: ad._count.impressions,
    clicks: ad._count.clicks
  }));

  const dailyStats = await getDailyStats({ advertiserId: id.toString() }) as any[];
  const placementStats = await getPlacementStats(id.toString()) as any[];
  const totalImps = dailyStats.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalClicks = dailyStats.reduce((acc, curr) => acc + curr.clicks, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-center sm:text-left text-slate-900">Advertiser: {advertiser.name}</h1>
            <div className="mt-2 flex items-center gap-4">
              <span className="text-2xl font-bold text-red-600 underline decoration-red-200 underline-offset-4">Balance: ¥{advertiser.balance.toLocaleString()}</span>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-200">Musubi Verified</span>
            </div>
          </div>
          <Link href="/" className="text-blue-600 hover:underline font-medium">← Back to Portal</Link>
        </header>

        {/* Stats & Transparency */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Impressions</h3>
            <div className="text-3xl font-black text-gray-900">{totalImps.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Clicks</h3>
            <div className="text-3xl font-black text-gray-900">{totalClicks.toLocaleString()}</div>
          </div>
          <div className="bg-emerald-50/50 p-6 rounded-xl shadow-sm border border-emerald-100 text-center">
            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Avg. Rev Share</h3>
            <div className="text-3xl font-black text-emerald-700">70%</div>
            <p className="text-[10px] text-emerald-500 mt-1 font-medium italic">Transparency: Paid to Publishers</p>
          </div>
          <div className="bg-blue-50/50 p-6 rounded-xl shadow-sm border border-blue-100 text-center">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Musubi Fee</h3>
            <div className="text-3xl font-black text-blue-700">30%</div>
            <p className="text-[10px] text-blue-500 mt-1 font-medium italic">Service & Optimization Fee</p>
          </div>
        </section>

        {/* Insights Section */}
        <InsightSection insights={advertiserInsights} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6 text-gray-800 tracking-tight">Performance Over Time</h2>
            <StatsChart data={dailyStats} />
          </section>
          
          <PlacementReportTable placements={placementStats} />
        </div>

        {/* Action Forms (Create New) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Step 1: Campaign */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-slate-800 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2 shadow-sm">1</span>
              New Campaign
            </h2>
            <form action={createCampaign} className="space-y-4">
              <input type="hidden" name="advertiser_id" value={id} />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Campaign Name</label>
                <input type="text" name="name" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none" placeholder="e.g. Winter Sale" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Start Date</label>
                  <input type="date" name="start_date" className="w-full p-2 border border-gray-200 rounded-lg text-xs" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">End Date</label>
                  <input type="date" name="end_date" className="w-full p-2 border border-gray-200 rounded-lg text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Total Budget (¥)</label>
                <input type="number" name="budget" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none" placeholder="50000" />
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-bold hover:bg-slate-700 transition-colors shadow-md">
                Create Campaign
              </button>
            </form>
          </section>

          {/* Step 2: Ad Group */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-emerald-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2 shadow-sm">2</span>
              New Ad Group
            </h2>
            <form action={createAdGroup} className="space-y-4">
              <input type="hidden" name="advertiser_id" value={id} />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Select Campaign</label>
                <select name="campaign_id" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 outline-none bg-white" required>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Group Name</label>
                <input type="text" name="name" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 outline-none" placeholder="e.g. Mobile Users" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Max Bid (¥)</label>
                <input type="number" name="max_bid" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 outline-none" placeholder="50" required />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-black text-gray-400 mb-2">Target Device</label>
                <div className="flex gap-4">
                  {['all', 'desktop', 'mobile'].map(d => (
                    <label key={d} className="inline-flex items-center text-sm font-medium cursor-pointer">
                      <input type="radio" name="target_device" value={d} defaultChecked={d === 'all'} className="mr-1 accent-emerald-600" /> {d.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-md">
                Create Ad Group
              </button>
            </form>
          </section>

          {/* Step 3: Ad */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2 shadow-sm">3</span>
              New Ad
            </h2>
            <form action={createAd} className="space-y-4">
              <input type="hidden" name="advertiser_id" value={id} />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ad Group</label>
                <select name="ad_group_id" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white" required>
                  {adGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.campaign_name})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input type="text" name="title" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ad Title" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Image URL</label>
                <input type="url" name="image_url" className="w-full p-2 border border-gray-200 rounded-lg text-xs" defaultValue="https://placehold.jp/300x250.png?text=New+Ad" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Target URL</label>
                <input type="url" name="target_url" className="w-full p-2 border border-gray-200 rounded-lg text-xs" placeholder="https://..." required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md">
                Publish Ad
              </button>
            </form>
          </section>
        </div>

        {/* Management Tables Section */}
        <div className="space-y-8">
          <CampaignsTable campaigns={campaigns} advertiserId={id.toString()} />
          <AdGroupsTable adGroups={adGroups} campaigns={campaigns} advertiserId={id.toString()} />
          <AdsPerformanceTable ads={ads} adGroups={adGroups} advertiserId={id.toString()} />
        </div>
      </div>
    </div>
  );
}
