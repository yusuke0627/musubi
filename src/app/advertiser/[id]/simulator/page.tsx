"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function ConversionSimulator() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const clickId = searchParams.get("click_id") || "";

  const [simulatedUrl, setSimulatedUrl] = useState("http://advertiser.com/purchase");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);

  const handleTrack = async () => {
    if (!clickId) {
      alert("Click ID is missing! Redirect from the dashboard to simulate a real click.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          click_id: clickId,
          url: simulatedUrl
        })
      });
      const data = await res.json();
      setResult(data);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="flex justify-between items-center border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-emerald-400">Conversion Sandbox</h1>
            <p className="text-slate-400 text-sm mt-2">広告主様のサイトへのランディングとコンバージョンをシミュレーションします。</p>
          </div>
          <Link href={`/advertiser/${id}`} className="text-slate-400 hover:text-white font-bold text-sm">
            ← Exit Simulator
          </Link>
        </header>

        <section className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 space-y-8">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${clickId ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Session Status: {clickId ? 'Active Click Session' : 'No Click ID Found'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Current Click ID</label>
              <code className="text-emerald-400 font-mono text-xs break-all">
                {clickId || "MISSING: Click an ad first!"}
              </code>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Simulated URL (Current Page)</label>
              <input 
                type="text" 
                value={simulatedUrl} 
                onChange={(e) => setSimulatedUrl(e.target.value)}
                className="w-full bg-transparent text-slate-100 font-mono text-sm outline-none border-b border-slate-700 focus:border-emerald-500 transition-colors py-1"
                placeholder="http://..."
              />
            </div>
          </div>

          <button 
            onClick={handleTrack}
            disabled={status === "loading" || !clickId}
            className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 ${
              !clickId ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
              'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
            }`}
          >
            {status === "loading" ? "Firing Tracking Pixels..." : "Track Pageview 🚀"}
          </button>

          {result && (
            <div className={`p-6 rounded-2xl border ${
              result.matched > 0 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-900 border-slate-700'
            }`}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                {result.matched > 0 ? '🎯 CONVERSION MATCHED!' : '👀 Pageview Tracked'}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-slate-500 mb-1">Rules Matched</div>
                  <div className="text-xl font-bold">{result.matched}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">New Conversions</div>
                  <div className="text-xl font-bold text-emerald-400">{result.conversions}</div>
                </div>
              </div>
              {result.conversions === 0 && result.matched > 0 && (
                <p className="text-[10px] text-orange-400 mt-4 italic">
                  Note: This conversion was already recorded for this click ID (deduplicated).
                </p>
              )}
            </div>
          )}
        </section>

        <section className="text-center">
          <p className="text-slate-500 text-xs italic">
            Musubi Tracking Sandbox v1.0. Use this to verify your URL patterns before deployment.
          </p>
        </section>
      </div>
    </div>
  );
}
