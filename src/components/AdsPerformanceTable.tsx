"use client";

import { useState } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import EditModal from "./EditModal";

interface AdPerformance {
  id: number;
  title: string;
  image_path: string | null;
  description: string | null;
  status: string;
  rejection_reason?: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  campaign_id: number;
  ad_group_id: number;
  group_name: string;
  max_bid: number;
  target_device: string;
  campaign_name: string;
  campaign_budget: number;
  start_date: string | Date | null;
  end_date?: string | Date | null;
  target_url: string;
}

interface AdsPerformanceTableProps {
  ads: AdPerformance[];
  adGroups: any[];
  advertiserId: string;
}

// 画像読み込み問題を回避するため、シンプルな実装に変更
export default function AdsPerformanceTable({ ads, adGroups, advertiserId }: AdsPerformanceTableProps) {
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

  const columnHelper = createColumnHelper<AdPerformance>();

  // シンプルな列定義（計算列なしで画像読み込み問題を回避）
  const columns: ColumnDef<AdPerformance, any>[] = [
    columnHelper.accessor("id", {
      id: "ad_info",
      header: "Ad Info",
      cell: (info) => {
        const ad = info.row.original;
        return (
          <div className="flex items-center min-w-[200px]">
            <img src={ad.image_path ?? undefined} className="w-12 h-10 object-cover rounded border border-gray-100 mr-3 shadow-sm" alt="" />
            <div>
              <div className="text-sm font-bold text-gray-900 leading-none mb-1">{ad.title}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">ID: {ad.id}</div>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const review_status = info.getValue();
        return (
          <div>
            <span className={`px-2 py-1 rounded text-[10px] font-black tracking-tighter ${
              review_status === 'approved' ? 'bg-green-100 text-green-800' : 
              review_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {review_status.toUpperCase()}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("campaign_name", {
      header: "Campaign",
    }),
    columnHelper.accessor("group_name", {
      header: "Ad Group",
      cell: (info) => <span className="italic text-gray-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor("max_bid", {
      header: "Max Bid",
      cell: (info) => <span className="font-mono font-bold text-gray-900">¥{info.getValue()}</span>,
    }),
    columnHelper.accessor("impressions", {
      header: "Imps",
      cell: (info) => <span className="font-mono font-bold text-slate-700">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor("clicks", {
      header: "Clicks",
      cell: (info) => <span className="font-mono font-bold text-slate-700">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor("conversions", {
      header: "CV",
      cell: (info) => <span className="font-mono font-bold text-blue-700">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor("revenue", {
      header: "Revenue",
      cell: (info) => <span className="font-mono font-bold text-emerald-700">¥{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <button 
          onClick={() => setEditModal({ isOpen: true, data: info.row.original })}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors shadow-sm"
        >
          Edit
        </button>
      ),
    }),
  ];

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

      <div className="p-6 border-b border-gray-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Ads Performance & Creative</h2>
        <p className="text-sm text-gray-500 mt-1">クリエイティブ別の成果レポートです。各項目でソートが可能です。</p>
      </div>

      <DataTable 
        columns={columns} 
        data={ads} 
        defaultVisibility={{
          campaign_name: false,
          target_device: false,
          revenue: true,
        }}
      />
    </section>
  );
}
