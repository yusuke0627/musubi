
"use client";

import { useState, useEffect } from "react";
import { use } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AuctionSimulator({ params }: PageProps) {
  const { id: advertiserId } = use(params);
  const [adUnits, setAdUnits] = useState<any[]>([]);
  const [selectedAdUnit, setSelectedAdUnit] = useState<string>("");
  const [ua, setUa] = useState<string>("Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const presets = [
    { name: "iPhone (Safari)", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1" },
    { name: "Android (Chrome)", ua: "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36" },
    { name: "Mac (Chrome)", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    { name: "Windows (Edge)", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59" },
  ];

  // 広告枠一覧の取得（本当はサーバーアクションか何かでやりたいけど、ここでは簡易的に）
  useEffect(() => {
    fetch("/api/ads.txt") // 既存のAPIを流用するか、新しく作るべきだけど、ここでは全AdUnitを取得する口がないので、シミュレーター用にAPIを叩く
      .then(() => {
        // 全AdUnitを取得するためのスタブ（後で修正）
        // 実際には全パブリッシャーのAdUnitを知る必要があるので、管理者権限が必要
      });
    
    // 仮で seed にある ID: 1, 2, 3, 100 をセット
    setAdUnits([
      { id: "1", name: "Tech Blog - Sidebar" },
      { id: "2", name: "News Site - Bottom" },
      { id: "3", name: "Game App - Interstitial" },
      { id: "100", name: "OS Targeting Preview Unit" },
    ]);
    setSelectedAdUnit("100");
  }, []);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inspect?ad_unit_id=${selectedAdUnit}&ua=${encodeURIComponent(ua)}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Auction Inspector 🔍</h1>
            <p className="text-slate-500 font-medium">Simulate ad auctions and see why ads are win or lose.</p>
          </div>
          <button 
            onClick={() => window.location.href = `/advertiser/${advertiserId}`}
            className="text-sm font-bold text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 transition-all"
          >
            ← Back to Dashboard
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                Simulation Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase mb-2">Target Ad Unit</label>
                  <select 
                    value={selectedAdUnit}
                    onChange={(e) => setSelectedAdUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {adUnits.map(u => (
                      <option key={u.id} value={u.id}>{u.name} (ID: {u.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase mb-2">User Agent Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map(p => (
                      <button
                        key={p.name}
                        onClick={() => setUa(p.ua)}
                        className={`text-[10px] font-bold py-2 px-1 rounded-lg border transition-all ${
                          ua === p.ua ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 shadow-sm'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase mb-2">Custom User Agent</label>
                  <textarea 
                    value={ua}
                    onChange={(e) => setUa(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-mono h-24 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <button 
                  onClick={runSimulation}
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                >
                  {loading ? "Running..." : "Run Simulation 🚀"}
                </button>
              </div>
            </section>

            {results && (
              <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
                  Auction Context
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Publisher</span>
                    <span className="font-bold">{results.context.publisher}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">OS / Device</span>
                    <span className="font-bold">{results.context.os} / {results.context.device}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Category</span>
                    <span className="font-bold uppercase tracking-wider text-[10px] bg-slate-800 px-2 py-0.5 rounded">{results.context.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Ads</span>
                    <span className="font-bold text-blue-400">{results.auction.total_ads}</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {!results && !loading && (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                <div className="text-6xl mb-4">🔬</div>
                <h3 className="text-xl font-bold text-slate-800">Ready to inspect?</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Select an ad unit and user agent to see how the auction performs in real-time.</p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
                <p className="text-slate-500 font-bold">Analyzing auction steps...</p>
              </div>
            )}

            {results && (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Auction Results</h2>
                  <span className="text-[10px] font-bold text-slate-400">TIMESTAMP: {new Date(results.context.timestamp).toLocaleString()}</span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Status</th>
                        <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Creative / Ad</th>
                        <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Group / Campaign</th>
                        <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Score / Bid</th>
                        <th className="p-4 font-black text-slate-400 uppercase text-[10px]">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.auction.results.map((r: any) => (
                        <tr key={r.ad_id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${r.status === 'WINNER' ? 'bg-yellow-50/50' : ''}`}>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                              r.status === 'WINNER' ? 'bg-yellow-400 text-yellow-900' : 
                              r.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {r.image_url && (
                                <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                                  <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <a 
                                  href={`/advertiser/${advertiserId}#ad-${r.ad_id}`}
                                  className="font-bold text-slate-900 hover:text-blue-600 hover:underline transition-colors block leading-tight"
                                >
                                  {r.title}
                                </a>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">ID: {r.ad_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <a 
                              href={`/advertiser/${advertiserId}#ad-group-${r.ad_group_id}`}
                              className="text-xs font-bold text-slate-700 hover:text-blue-600 hover:underline transition-colors block"
                            >
                              {r.ad_group}
                            </a>
                            <a 
                              href={`/advertiser/${advertiserId}#campaign-${r.campaign_id}`}
                              className="text-[10px] text-slate-400 font-bold hover:text-blue-600 hover:underline transition-colors block"
                            >
                              {r.campaign_name}
                            </a>
                          </td>
                          <td className="p-4">
                            <div className="font-mono text-blue-600 font-bold">{r.score.toFixed(4)}</div>
                            <div className="text-[10px] text-slate-400">Bid: ¥{r.max_bid}</div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                              r.reason === 'OUTBID' ? 'text-slate-400 bg-slate-50' : 
                              r.reason ? 'text-red-500 bg-red-50' : 'text-slate-300'
                            }`}>
                              {r.reason || "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
