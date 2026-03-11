import db from "@/lib/db";
import { getDailyStats } from "@/services/stats";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatsChart from "@/components/StatsChart";
import { createCampaign, createAdGroup, createAd } from "./actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdvertiserDashboard({ params }: PageProps) {
  const { id } = await params;
  const advertiser = db.prepare('SELECT * FROM advertisers WHERE id = ?').get(id) as any;

  if (!advertiser) return notFound();

  const campaigns = db.prepare('SELECT * FROM campaigns WHERE advertiser_id = ?').all(id) as any[];
  const adGroups = db.prepare('SELECT ad_groups.*, campaigns.name as campaign_name FROM ad_groups JOIN campaigns ON ad_groups.campaign_id = campaigns.id WHERE campaigns.advertiser_id = ?').all(id) as any[];
  const publishers = db.prepare('SELECT id, name FROM publishers').all() as any[];

  const ads = db.prepare(`
    SELECT ads.*, ad_groups.name as ad_group_name,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as clicks
    FROM ads
    JOIN ad_groups ON ads.ad_group_id = ad_groups.id
    JOIN campaigns ON ad_groups.campaign_id = campaigns.id
    WHERE campaigns.advertiser_id = ?
    ORDER BY ads.id DESC
  `).all(id) as any[];

  const dailyStats = getDailyStats({ advertiserId: id }) as any[];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center border-b pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advertiser: {advertiser.name}</h1>
            <div className="mt-2 text-2xl font-bold text-red-600">Balance: ¥{advertiser.balance.toLocaleString()}</div>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">← Back to Portal</Link>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Network Performance</h2>
          <StatsChart data={dailyStats} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Step 1: Campaign */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-slate-800 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">1</span>
              New Campaign
            </h2>
            <form action={createCampaign} className="space-y-4">
              <input type="hidden" name="advertiser_id" value={id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input type="text" name="name" className="w-full p-2 border rounded-lg" placeholder="e.g. Winter Sale" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (¥)</label>
                <input type="number" name="budget" className="w-full p-2 border rounded-lg" placeholder="50000" />
              </div>
              <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors">
                Create Campaign
              </button>
            </form>
          </section>

          {/* Step 2: Ad Group */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-emerald-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">2</span>
              New Ad Group
            </h2>
            <form action={createAdGroup} className="space-y-4">
              <input type="hidden" name="advertiser_id" value={id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Campaign</label>
                <select name="campaign_id" className="w-full p-2 border rounded-lg" required>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input type="text" name="name" className="w-full p-2 border rounded-lg" placeholder="e.g. Mobile Users" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Bid (¥)</label>
                <input type="number" name="max_bid" className="w-full p-2 border rounded-lg" placeholder="50" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-xs uppercase tracking-wider font-bold text-gray-400">Target Device</label>
                <div className="flex gap-4 mt-1">
                  {['all', 'desktop', 'mobile'].map(d => (
                    <label key={d} className="inline-flex items-center text-sm">
                      <input type="radio" name="target_device" value={d} defaultChecked={d === 'all'} className="mr-1" /> {d.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
                Create Ad Group
              </button>
            </form>
          </section>

          {/* Step 3: Ad */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">3</span>
              New Ad
            </h2>
            <form action={createAd} className="space-y-4">
              <input type="hidden" name="advertiser_id" value={id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Group</label>
                <select name="ad_group_id" className="w-full p-2 border rounded-lg" required>
                  {adGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.campaign_name})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" name="title" className="w-full p-2 border rounded-lg" placeholder="Ad Title" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" name="image_url" className="w-full p-2 border rounded-lg text-xs" defaultValue="https://placehold.jp/300x250.png?text=New+Ad" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
                <input type="url" name="target_url" className="w-full p-2 border rounded-lg text-xs" placeholder="https://..." required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                Publish Ad
              </button>
            </form>
          </section>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">My Ads Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-center">Imps</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-center">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-center">CTR</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img src={ad.image_url} className="w-12 h-10 object-cover rounded border mr-3" alt="" />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{ad.title}</div>
                          <div className="text-xs text-gray-500">{ad.ad_group_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        ad.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        ad.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ad.status.toUpperCase()}
                      </span>
                      {ad.status === 'rejected' && (
                        <div className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={ad.rejection_reason}>
                          {ad.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center font-mono">{ad.impressions}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center font-mono">{ad.clicks}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 text-center font-bold">
                      {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00'}%
                    </td>
                  </tr>
                ))}
                {ads.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No ads found. Start by creating a campaign!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
