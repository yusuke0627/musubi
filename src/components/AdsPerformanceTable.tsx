"use client";

import { useState, useMemo } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
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
  conversions: number;
  revenue: number;
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

export default function AdsPerformanceTable({ ads, adGroups, advertiserId }: AdsPerformanceTableProps) {
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

  const columnHelper = createColumnHelper<AdPerformance>();

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      id: "ad_info",
      header: "Ad Info",
      cell: (info) => {
        const ad = info.row.original;
        return (
          <div className="flex items-center min-w-[200px]">
            <img src={ad.image_url ?? undefined} className="w-12 h-10 object-cover rounded border border-gray-100 mr-3 shadow-sm" alt="" />
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
        const status = info.getValue();
        const ad = info.row.original;
        return (
          <div>
            <span className={`px-2 py-1 rounded text-[10px] font-black tracking-tighter ${
              status === 'approved' ? 'bg-green-100 text-green-800' : 
              status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {status.toUpperCase()}
            </span>
            {status === 'rejected' && (
              <div className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate font-medium italic" title={ad.rejection_reason || ''}>
                {ad.rejection_reason}
              </div>
            )}
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
    columnHelper.accessor("target_device", {
      header: "Device",
      cell: (info) => <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{info.getValue()}</span>,
    }),
    columnHelper.accessor("impressions", {
      header: "Imps",
      cell: (info) => <span className="font-mono font-bold text-slate-700">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor("clicks", {
      header: "Clicks",
      cell: (info) => <span className="font-mono font-bold text-slate-700">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.display({
      id: "ctr",
      header: "CTR",
      cell: (info) => {
        const { impressions, clicks } = info.row.original;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        return <span className="text-blue-600 font-black">{ctr.toFixed(2)}%</span>;
      },
      sortingFn: (rowA, rowB) => {
        const ctrA = rowA.original.impressions > 0 ? rowA.original.clicks / rowA.original.impressions : 0;
        const ctrB = rowB.original.impressions > 0 ? rowB.original.clicks / rowB.original.impressions : 0;
        return ctrA - ctrB;
      }
    }),
    columnHelper.accessor("conversions", {
      header: "CV",
      cell: (info) => <span className="font-mono font-bold text-blue-700">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.display({
      id: "cvr",
      header: "CVR",
      cell: (info) => {
        const { clicks, conversions } = info.row.original;
        const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
        return <span className="text-blue-600 font-black">{cvr.toFixed(2)}%</span>;
      },
      sortingFn: (rowA, rowB) => {
        const cvrA = rowA.original.clicks > 0 ? rowA.original.conversions / rowA.original.clicks : 0;
        const cvrB = rowB.original.clicks > 0 ? rowB.original.conversions / rowB.original.clicks : 0;
        return cvrA - cvrB;
      }
    }),
    columnHelper.display({
      id: "cpa",
      header: "CPA",
      cell: (info) => {
        const { clicks, max_bid, conversions } = info.row.original;
        const cpa = conversions > 0 ? (clicks * max_bid) / conversions : 0;
        return <span className="font-mono font-bold text-emerald-700">{cpa > 0 ? `¥${Math.floor(cpa).toLocaleString()}` : '-'}</span>;
      },
      sortingFn: (rowA, rowB) => {
        const cpaA = rowA.original.conversions > 0 ? (rowA.original.clicks * rowA.original.max_bid) / rowA.original.conversions : 0;
        const cpaB = rowB.original.conversions > 0 ? (rowB.original.clicks * rowB.original.max_bid) / rowB.original.conversions : 0;
        return cpaA - cpaB;
      }
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
  ], [columnHelper, adGroups]);

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
        columns={columns as ColumnDef<AdPerformance, any>[]} 
        data={ads} 
        rowIdPrefix="ad"
        defaultVisibility={{
          campaign_name: false,
          target_device: false,
          revenue: true,
        }}
      />
    </section>
  );
}
