"use client";

import { useState } from "react";
import EditModal from "./EditModal";

interface AdPerformance {
  id: number;
  title: string;
  image_url: string | null;
  description: string | null;
  status: string;
  rejection_reason?: string | null;
  impressions: number;
  clicks: number;
  campaign_id: number;
  ad_group_id: number;
  group_name: string;
  max_bid: number;
  target_device: string;
  campaign_name: string;
  campaign_budget: number;
  start_date: string | Date;
  end_date?: string | Date | null;
  target_url: string;
}

interface AdsPerformanceTableProps {
  ads: AdPerformance[];
  adGroups: any[];
  advertiserId: string;
}

const COLUMN_LABELS: Record<string, string> = {
  campaign: "Campaign",
  duration: "Duration",
  adGroup: "Ad Group",
  bid: "Max Bid",
  device: "Device",
  targetUrl: "Target URL",
  stats: "Stats",
};

export default function AdsPerformanceTable({ ads, adGroups, advertiserId }: AdsPerformanceTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(["adGroup", "stats"])
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Edit Modal State
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    data: any;
  }>({ isOpen: false, data: null });

  const toggleColumn = (col: string) => {
    const next = new Set(visibleColumns);
    if (next.has(col)) {
      next.delete(col);
    } else {
      next.add(col);
    }
    setVisibleColumns(next);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-12">
      <EditModal 
        isOpen={editModal.isOpen} 
        onClose={() => setEditModal({ isOpen: false, data: null })} 
        advertiserId={advertiserId}
        type="ad"
        data={editModal.data}
        adGroups={adGroups}
      />

      <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Ads Performance & Creative</h2>
        
        <div className="relative">
          <button 
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>📊 Columns</span>
            <svg className={`w-4 h-4 transition-transform ${showColumnSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>

          {showColumnSelector && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-10 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 border-b pb-2">Select Display Columns</p>
              {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                  <input 
                    type="checkbox" 
                    checked={visibleColumns.has(key)} 
                    onChange={() => toggleColumn(key)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 border-r border-gray-100 min-w-[200px]">Ad Info</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              {visibleColumns.has("campaign") && <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Campaign</th>}
              {visibleColumns.has("duration") && <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Duration</th>}
              {visibleColumns.has("adGroup") && <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Ad Group</th>}
              {visibleColumns.has("bid") && <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Max Bid</th>}
              {visibleColumns.has("device") && <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Device</th>}
              {visibleColumns.has("targetUrl") && <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Target URL</th>}
              {visibleColumns.has("stats") && (
                <>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Imps</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Clicks</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">CTR</th>
                </>
              )}
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest sticky right-0 bg-gray-50 z-10 border-l border-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ads.map((ad) => (
              <tr key={ad.id} className="hover:bg-gray-50 transition-colors text-sm">
                <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-gray-100 group">
                  <div className="flex items-center min-w-[200px]">
                    <img src={ad.image_url || ''} className="w-12 h-10 object-cover rounded border border-gray-100 mr-3 shadow-sm" alt="" />
                    <div>
                      <div className="text-sm font-bold text-gray-900 leading-none mb-1">{ad.title}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">ID: {ad.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-[10px] font-black tracking-tighter ${
                    ad.status === 'approved' ? 'bg-green-100 text-green-800' : 
                    ad.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ad.status.toUpperCase()}
                  </span>
                  {ad.status === 'rejected' && (
                    <div className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate font-medium italic" title={ad.rejection_reason || ''}>
                      {ad.rejection_reason}
                    </div>
                  )}
                </td>
                {visibleColumns.has("campaign") && <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{ad.campaign_name}</td>}
                {visibleColumns.has("duration") && (
                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                    <div className="font-bold">{new Date(ad.start_date).toLocaleDateString('ja-JP')}</div>
                    <div className="text-[10px]">to {ad.end_date ? new Date(ad.end_date).toLocaleDateString('ja-JP') : 'Endless'}</div>
                  </td>
                )}
                {visibleColumns.has("adGroup") && <td className="px-6 py-4 text-gray-600 whitespace-nowrap italic">{ad.group_name}</td>}
                {visibleColumns.has("bid") && <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">¥{ad.max_bid}</td>}
                {visibleColumns.has("device") && (
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{ad.target_device}</span>
                  </td>
                )}
                {visibleColumns.has("targetUrl") && (
                  <td className="px-6 py-4 text-xs text-blue-500 truncate max-w-[150px]" title={ad.target_url}>{ad.target_url}</td>
                )}
                {visibleColumns.has("stats") && (
                  <>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{ad.impressions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{ad.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center text-blue-600 font-black">
                      {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00'}%
                    </td>
                  </>
                )}
                <td className="px-6 py-4 text-center sticky right-0 bg-white z-10 border-l border-gray-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                  <button 
                    onClick={() => setEditModal({ isOpen: true, data: ad })}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Edit Ad
                  </button>
                </td>
              </tr>
            ))}
            {ads.length === 0 && (
              <tr><td colSpan={12} className="px-6 py-12 text-center text-gray-400 italic font-medium">No ads found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
