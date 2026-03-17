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
import { createCampaign, createAdGroup, createAd, createConversionRule, deleteConversionRule } from "./actions";
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
    where: { id },
    include: {
      conversionRules: {
        include: {
          conversions: true
        }
      }
    }
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

  // CV & KPI計算
  const conversionRules = advertiser.conversionRules;
  const allConversions = conversionRules.flatMap(r => r.conversions);
  const totalRevenue = allConversions.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalCost = dailyStats.reduce((acc, curr) => acc + curr.cost, 0);
  const totalCV = allConversions.length;

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
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Impressions</h3>
            <div className="text-2xl font-black text-gray-900">{totalImps.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Clicks</h3>
            <div className="text-2xl font-black text-gray-900">{totalClicks.toLocaleString()}</div>
            <p className="text-[10px] text-gray-400 font-bold">CTR: {totalImps > 0 ? ((totalClicks / totalImps) * 100).toFixed(2) : 0}%</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Total Budget (¥)</label>
                  <input type="number" name="budget" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none" placeholder="50000" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Daily Budget (¥)</label>
                  <input type="number" name="daily_budget" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none" placeholder="1000" />
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Bid (¥)</label>
                  <input type="number" name="max_bid" className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 outline-none" placeholder="50" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Target Category</label>
                  <select name="target_category" className="w-full p-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-100">
                    <option value="">Any Category</option>
                    <option value="anime">Anime & Manga</option>
                    <option value="game">Games</option>
                    <option value="tech">Technology</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="business">Business</option>
                  </select>
                </div>
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

        {/* Conversion Tracking Configuration */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Conversion Tracking</h2>
              <p className="text-sm text-gray-500 mt-1">広告主様のサイトでのアクション（購入・登録など）を計測します。</p>
            </div>
            <Link 
              href={`/advertiser/${id}/simulator?click_id=${allConversions[0]?.click_id || 'test-session-123'}`}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Launch Conversion Simulator (Sandbox)
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Tag Snippet */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">1. Global Tracking Tag</h3>
              <p className="text-sm text-gray-600">
                下記のタグを、あなたのサイトの全ページの <code>&lt;head&gt;</code> 内に一度だけ貼り付けてください。
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-emerald-400 p-6 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed shadow-lg">
{`<script>
  (function() {
    const urlParams = new URLSearchParams(window.location.search);
    const clickId = urlParams.get('click_id');
    if (clickId) {
      localStorage.setItem('musubi_click_id', clickId);
    }
    const storedClickId = localStorage.getItem('musubi_click_id');
    if (storedClickId) {
      fetch('http://localhost:3000/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          click_id: storedClickId,
          url: window.location.href
        })
      }).catch(console.error);
    }
  })();
</script>`}
                </pre>
                <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-[10px] font-bold uppercase">Production Ready</div>
              </div>
            </div>

            {/* Rules Management */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">2. Conversion Rules</h3>
              
              {/* Rule Creation Form */}
              <form action={createConversionRule} className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                <input type="hidden" name="advertiser_id" value={id} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Rule Name</label>
                    <input type="text" name="name" className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Purchase Completed" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">URL Pattern (contains)</label>
                    <input type="text" name="url_pattern" className="w-full p-2 border rounded-lg text-sm font-mono" placeholder="/thanks" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Category</label>
                    <select name="label" className="w-full p-2 border rounded-lg text-sm bg-white">
                      <option value="macro">Macro (Goal/Revenue)</option>
                      <option value="micro">Micro (Intermediate)</option>
                      <option value="landing_page">Landing Page</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Value (¥)</label>
                    <input type="number" name="revenue" className="w-full p-2 border rounded-lg text-sm" placeholder="1000" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                  Add Conversion Rule
                </button>
              </form>

              {/* Rules List */}
              <div className="overflow-hidden border border-gray-100 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Rule / URL</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">CV</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">CVR</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">CPA</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Value</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {conversionRules.map(rule => {
                      const cvCount = rule.conversions.length;
                      const cvr = totalClicks > 0 ? (cvCount / totalClicks) * 100 : 0;
                      const cpa = cvCount > 0 ? totalCost / cvCount : 0;
                      
                      return (
                        <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-sm font-bold text-gray-900">{rule.name}</div>
                            <div className="text-[10px] font-mono text-gray-400">{rule.url_pattern}</div>
                            <div className="mt-1">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                rule.label === 'macro' ? 'bg-blue-100 text-blue-700' : 
                                rule.label === 'micro' ? 'bg-indigo-100 text-indigo-700' : 
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {rule.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                            {cvCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-medium text-blue-600">
                            {cvr.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                            {cpa > 0 ? `¥${Math.floor(cpa).toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono font-bold text-gray-900">
                            ¥{rule.revenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <form action={deleteConversionRule}>
                              <input type="hidden" name="advertiser_id" value={id} />
                              <input type="hidden" name="rule_id" value={rule.id} />
                              <button type="submit" className="text-red-400 hover:text-red-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    {conversionRules.length > 0 && (
                      <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                        <td className="px-4 py-4 text-sm text-slate-900 uppercase tracking-wider">Total (All Rules)</td>
                        <td className="px-4 py-4 text-right text-sm">{totalCV.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-sm text-blue-700">{(totalClicks > 0 ? (totalCV / totalClicks) * 100 : 0).toFixed(2)}%</td>
                        <td className="px-4 py-4 text-right text-sm text-slate-700">¥{(totalCV > 0 ? Math.floor(totalCost / totalCV) : 0).toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-sm font-mono text-emerald-700">¥{totalRevenue.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    )}
                    {conversionRules.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400 italic">No rules defined yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
