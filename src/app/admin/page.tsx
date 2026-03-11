import db from "@/lib/db";
import { getDailyStats } from "@/services/stats";
import Link from "next/link";
import StatsChart from "@/components/StatsChart";
import { processClicks, completePayout, updateRevShare, reviewAd } from "./actions";

export default async function AdminDashboard() {
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions) as total_impressions,
      (SELECT COUNT(*) FROM clicks WHERE is_valid = 1) as total_clicks
  `).get() as any;

  const advertisers = db.prepare('SELECT * FROM advertisers').all() as any[];
  const publishers = db.prepare('SELECT * FROM publishers').all() as any[];
  
  const ads = db.prepare(`
    SELECT ads.*, advertisers.name as advertiser_name, ad_groups.max_bid as current_bid,
    (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as impressions,
    (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as clicks
    FROM ads
    JOIN ad_groups ON ads.ad_group_id = ad_groups.id
    JOIN campaigns ON ad_groups.campaign_id = campaigns.id
    JOIN advertisers ON campaigns.advertiser_id = advertisers.id
    ORDER BY ads.id DESC
  `).all() as any[];

  const dailyStats = getDailyStats() as any[];

  // クリック履歴
  const pendingClicks = db.prepare('SELECT clicks.*, ads.title as ad_title FROM clicks JOIN ads ON clicks.ad_id = ads.id WHERE processed = 0 ORDER BY created_at DESC').all() as any[];
  const processedClicks = db.prepare('SELECT clicks.*, ads.title as ad_title FROM clicks JOIN ads ON clicks.ad_id = ads.id WHERE processed = 1 ORDER BY created_at DESC LIMIT 50').all() as any[];

  // 支払いリクエスト
  const pendingPayouts = db.prepare('SELECT payouts.*, publishers.name as publisher_name FROM payouts JOIN publishers ON payouts.publisher_id = publishers.id WHERE status = \'pending\' ORDER BY created_at ASC').all() as any[];
  const processedPayouts = db.prepare('SELECT payouts.*, publishers.name as publisher_name FROM payouts JOIN publishers ON payouts.publisher_id = publishers.id WHERE status = \'paid\' ORDER BY paid_at DESC LIMIT 20').all() as any[];

  // 審査待ち広告
  const pendingAds = db.prepare('SELECT ads.*, advertisers.name as advertiser_name FROM ads JOIN ad_groups ON ads.ad_group_id = ad_groups.id JOIN campaigns ON ad_groups.campaign_id = campaigns.id JOIN advertisers ON campaigns.advertiser_id = advertisers.id WHERE ads.status = \'pending\' ORDER BY ads.id ASC').all() as any[];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight text-center sm:text-left">Admin Dashboard (Total Analytics)</h1>
          <Link href="/" className="text-blue-600 hover:underline">← Back to Portal</Link>
        </header>

        {/* Global Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Network Impressions</h3>
            <div className="text-3xl font-bold text-gray-900">{stats.total_impressions.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Network Clicks</h3>
            <div className="text-3xl font-bold text-gray-900">{stats.total_clicks.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Avg. CTR</h3>
            <div className="text-3xl font-bold text-blue-600">
              {stats.total_impressions > 0 ? ((stats.total_clicks / stats.total_impressions) * 100).toFixed(2) : '0.00'}%
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Network Performance Over Time</h2>
          <StatsChart data={dailyStats} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Click Validation */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[550px]">
            <div className="p-6 border-b border-gray-100 bg-orange-50/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">Click Validation</h2>
                <form action={processClicks}>
                  <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm whitespace-nowrap">
                    Validate & Settle Clicks ({pendingClicks.length})
                  </button>
                </form>
              </div>
              
              <div className="bg-white/60 border border-orange-100 rounded-lg p-3 text-[11px] text-orange-800 leading-relaxed">
                <p className="font-bold mb-1 flex items-center text-xs">
                  <span className="mr-1">⚙️</span> クリック検証ロジック:
                </p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li><strong>重複排除</strong>: 同一IP・同一広告への10秒以内の連続クリックを無効化。</li>
                  <li><strong>整合性チェック</strong>: 広告グループおよびキャンペーンの有効性を確認。</li>
                  <li><strong>残高確認</strong>: 広告主のデポジット残高が入札額を満たしているかチェック。</li>
                  <li><strong>即時決済</strong>: 広告主残高から減算し、媒体社の収益として確定・加算。</li>
                </ul>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingClicks.map((click) => (
                    <tr key={click.id}>
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(click.created_at).toLocaleTimeString()}</td>
                      <td className="px-4 py-2 text-xs font-bold text-gray-900">{click.ad_title}</td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-400">{click.ip_address}</td>
                    </tr>
                  ))}
                  {pendingClicks.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-12 text-center text-gray-400 italic">No pending clicks.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ad Review Queue */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
            <div className="p-6 border-b border-gray-100 bg-emerald-50/30">
              <h2 className="text-xl font-bold text-gray-800">Ad Review Queue</h2>
            </div>
            <div className="flex-1 overflow-auto p-0">
              {pendingAds.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {pendingAds.map((ad) => (
                    <div key={ad.id} className="p-6 flex flex-col sm:flex-row gap-6">
                      <img src={ad.image_url} className="w-32 h-24 object-cover rounded-lg border shadow-sm flex-shrink-0" alt="" />
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{ad.title}</div>
                        <div className="text-sm text-gray-500 mb-2">{ad.description}</div>
                        <div className="text-xs text-blue-600 mb-4">{ad.advertiser_name}</div>
                        <div className="flex flex-wrap gap-2">
                          <form action={reviewAd}>
                            <input type="hidden" name="ad_id" value={ad.id} />
                            <input type="hidden" name="action" value="approve" />
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors">Approve</button>
                          </form>
                          <form action={reviewAd} className="flex gap-2 items-center flex-1 min-w-[200px]">
                            <input type="hidden" name="ad_id" value={ad.id} />
                            <input type="hidden" name="action" value="reject" />
                            <input type="text" name="rejection_reason" placeholder="Reject reason..." required className="flex-1 border p-1 text-xs rounded" />
                            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors">Reject</button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-12 text-center text-gray-400 italic">No ads pending review.</div>
              )}
            </div>
          </section>
        </div>

        {/* Payout Management */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800">Payout Management</h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publisher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingPayouts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{p.publisher_name}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-right text-emerald-600 whitespace-nowrap">¥{p.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <form action={completePayout}>
                        <input type="hidden" name="payout_id" value={p.id} />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors">
                          Mark as Paid
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {pendingPayouts.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">No pending payout requests.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Master Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Publishers Table */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">Registered Publishers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Publisher</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase text-right">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase text-center">Rev Share</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {publishers.map((pub) => (
                    <tr key={pub.id}>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-gray-900">{pub.name}</div>
                        <div className="text-[10px] text-gray-400">{pub.domain}</div>
                      </td>
                      <td className="px-4 py-4 text-sm font-mono text-right text-gray-600">¥{pub.balance.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <form action={updateRevShare} className="flex gap-2 justify-center">
                          <input type="hidden" name="publisher_id" value={pub.id} />
                          <input type="number" name="rev_share" defaultValue={pub.rev_share} step="0.01" min="0" max="1" className="w-16 border rounded text-xs p-1 text-center" />
                          <button type="submit" className="bg-slate-700 text-white px-2 py-1 rounded text-[10px] font-bold">Set</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Advertisers Table */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">Registered Advertisers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {advertisers.map((adv) => (
                    <tr key={adv.id}>
                      <td className="px-4 py-4 font-bold text-gray-900">{adv.name}</td>
                      <td className="px-4 py-4 text-right font-mono text-gray-600">¥{adv.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Network Ads Table */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Active Ads Across Network</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advertiser</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Impressions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Clicks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 flex items-center">
                      <img src={ad.image_url} className="w-10 h-10 object-cover rounded-md border mr-3" alt="" />
                      <div className="text-sm font-bold text-gray-900">{ad.title}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{ad.advertiser_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        ad.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        ad.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ad.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-mono">{ad.impressions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-mono">{ad.clicks.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
