import prisma from "@/lib/db";
import { getDailyStats, getAdUnitStats } from "@/services/stats";
import Link from "next/link";
import { notFound, forbidden } from "next/navigation";
import StatsChart from "@/components/StatsChart";
import AdUnitPerformanceTable from "@/components/AdUnitPerformanceTable";
import { requestPayout, updatePublisherProfile, createApp, deleteApp, createAdUnit, deleteAdUnit } from "./actions";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublisherDashboard({ params }: PageProps) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  const session = await auth();
  const user = session?.user as any;

  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== id)) {
    return forbidden();
  }

  const publisher = await prisma.publisher.findUnique({
    where: { id },
    include: {
      apps: {
        include: {
          adUnits: true
        }
      }
    }
  });

  if (!publisher) return notFound();

  const impressionsCount = await prisma.impression.count({ where: { publisher_id: id } });
  const clicksCount = await prisma.click.count({ where: { publisher_id: id, is_valid: 1 } });
  const dailyStats = await getDailyStats({ publisherId: id.toString() }) as any[];
  const adUnitStats = await getAdUnitStats(id.toString());

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Publisher: {publisher.name}</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your apps, ad units and track earnings.</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline font-bold">← Back to Portal</Link>
        </header>

        {/* Overview Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Impressions</h3>
            <div className="text-3xl font-black text-slate-900">{impressionsCount.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valid Clicks</h3>
            <div className="text-3xl font-black text-slate-900">{clicksCount.toLocaleString()}</div>
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100 text-center">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Current Balance</h3>
            <div className="text-3xl font-black text-emerald-700">¥{publisher.balance.toLocaleString()}</div>
          </div>
          <div className="bg-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100 text-center">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Revenue Share</h3>
            <div className="text-3xl font-black text-blue-700">{publisher.rev_share * 100}%</div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-black mb-6 text-slate-800 tracking-tight">Performance History</h2>
          <StatsChart data={dailyStats} />
        </section>

        {/* Ad Unit Analysis Report */}
        <AdUnitPerformanceTable stats={adUnitStats} />

        {/* App & Ad Unit Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">Apps & Ad Units</h2>
            </div>

            {publisher.apps.length === 0 && (
              <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-medium">No apps registered yet. Add your first app to start serving ads!</p>
              </div>
            )}

            {publisher.apps.map(app => (
              <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{app.name}</h3>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase">{app.platform}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{app.domain || app.bundle_id}</p>
                  </div>
                  <form action={deleteApp}>
                    <input type="hidden" name="app_id" value={app.id} />
                    <input type="hidden" name="publisher_id" value={publisher.id} />
                    <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </form>
                </div>
                
                <div className="p-6 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Ad Units</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {app.adUnits.map(unit => (
                      <div key={unit.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 group relative">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-sm font-bold text-slate-800">{unit.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">ID: {unit.id} • {unit.width}x{unit.height}</div>
                          </div>
                          <div className="flex gap-2">
                            <a 
                              href={`/api/serve?ad_unit_id=${unit.id}`}
                              target="_blank"
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="Live Preview"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </a>
                            <form action={deleteAdUnit}>
                              <input type="hidden" name="ad_unit_id" value={unit.id} />
                              <input type="hidden" name="publisher_id" value={publisher.id} />
                              <button type="submit" className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </form>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Ad Tag (iframe)</label>
                          <code className="text-[9px] bg-slate-900 text-emerald-400 p-2 rounded block overflow-x-auto font-mono">
                            {`<iframe src="http://localhost:3000/api/serve?ad_unit_id=${unit.id}" width="${unit.width}" height="${unit.height}" frameborder="0"></iframe>`}
                          </code>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Ad Unit Card */}
                    <form action={createAdUnit} className="p-4 rounded-xl border-2 border-dashed border-slate-200 flex flex-col justify-center items-center gap-2 hover:border-blue-300 transition-colors">
                      <input type="hidden" name="app_id" value={app.id} />
                      <div className="flex gap-2 w-full">
                        <input type="text" name="name" placeholder="Unit Name" className="flex-1 text-xs p-1.5 border rounded" required />
                        <select name="ad_type" className="text-xs p-1.5 border rounded bg-white">
                          <option value="banner">Banner</option>
                          <option value="interstitial">Interstitial</option>
                        </select>
                      </div>
                      <div className="flex gap-2 w-full">
                        <input type="number" name="width" placeholder="Width" className="w-full text-xs p-1.5 border rounded" defaultValue={300} />
                        <input type="number" name="height" placeholder="Height" className="w-full text-xs p-1.5 border rounded" defaultValue={250} />
                      </div>
                      <button type="submit" className="w-full py-1.5 bg-slate-800 text-white rounded text-[10px] font-bold uppercase hover:bg-slate-700">+ Add Ad Unit</button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Sidebar Actions */}
          <aside className="space-y-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-black mb-4 text-slate-800 tracking-tight">Register New App</h2>
              <form action={createApp} className="space-y-4">
                <input type="hidden" name="publisher_id" value={publisher.id} />
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">App Name</label>
                  <input type="text" name="name" placeholder="e.g. My Tech Blog" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Platform</label>
                  <select name="platform" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none">
                    <option value="web">Web (Domain)</option>
                    <option value="ios">iOS (App Store)</option>
                    <option value="android">Android (Play Store)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Identifier (Domain/Bundle)</label>
                  <input type="text" name="domain" placeholder="example.com or com.myapp" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none" />
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Add App</button>
              </form>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-black mb-4 text-slate-800 tracking-tight">Publisher Profile</h2>
              <form action={updatePublisherProfile} className="space-y-4">
                <input type="hidden" name="publisher_id" value={publisher.id} />
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Site Category</label>
                  <select name="category" defaultValue={publisher.category || ""} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none">
                    <option value="">Any Category</option>
                    <option value="anime">Anime & Manga</option>
                    <option value="game">Games</option>
                    <option value="tech">Technology</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all">Save Changes</button>
              </form>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-black mb-4 text-slate-800 tracking-tight">Payout</h2>
              <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Min. Payout</span>
                  <span className="text-sm font-bold text-slate-700">¥1,000</span>
                </div>
                <form action={requestPayout}>
                  <input type="hidden" name="publisher_id" value={publisher.id} />
                  <button type="submit" disabled={publisher.balance < 1000} className={`w-full py-3 rounded-xl font-black text-xs uppercase shadow-md transition-all ${publisher.balance < 1000 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'}`}>Request Payout</button>
                </form>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
