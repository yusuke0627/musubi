"use client";

import { useMemo } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";

interface AdUnitStat {
  id: number;
  name: string;
  app_name: string;
  ad_type: string;
  width: number | null;
  height: number | null;
  impressions: number;
  clicks: number;
  revenue: number;
}

interface AdUnitPerformanceTableProps {
  stats: AdUnitStat[];
}

export default function AdUnitPerformanceTable({ stats }: AdUnitPerformanceTableProps) {
  const columnHelper = createColumnHelper<AdUnitStat>();

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      id: "ad_unit",
      header: "Ad Unit / App",
      cell: (info) => (
        <div>
          <div className="font-bold text-gray-900 leading-tight">{info.getValue()}</div>
          <div className="text-[10px] text-gray-400 uppercase font-medium">{info.row.original.app_name}</div>
        </div>
      ),
    }),
    columnHelper.accessor("ad_type", {
      header: "Format",
      cell: (info) => (
        <div>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
            {info.getValue()}
          </span>
          {info.row.original.width && (
            <div className="text-[10px] text-gray-400 mt-1 font-mono">
              {info.row.original.width}x{info.row.original.height}
            </div>
          )}
        </div>
      ),
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
        return <span className="text-gray-600 font-bold">{ctr.toFixed(2)}%</span>;
      },
      sortingFn: (rowA, rowB) => {
        const ctrA = rowA.original.impressions > 0 ? rowA.original.clicks / rowA.original.impressions : 0;
        const ctrB = rowB.original.impressions > 0 ? rowB.original.clicks / rowB.original.impressions : 0;
        return ctrA - ctrB;
      }
    }),
    columnHelper.accessor("revenue", {
      header: "Est. Revenue",
      cell: (info) => <span className="font-mono font-bold text-emerald-700">¥{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.display({
      id: "ecpm",
      header: "eCPM",
      cell: (info) => {
        const { impressions, revenue } = info.row.original;
        const ecpm = impressions > 0 ? (revenue / impressions) * 1000 : 0;
        return (
          <div className="text-right">
            <span className="font-mono font-black text-blue-700">¥{Math.floor(ecpm).toLocaleString()}</span>
            <div className="text-[8px] text-blue-400 font-bold uppercase leading-none">Efficiency</div>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const ecpmA = rowA.original.impressions > 0 ? rowA.original.revenue / rowA.original.impressions : 0;
        const ecpmB = rowB.original.impressions > 0 ? rowB.original.revenue / rowB.original.impressions : 0;
        return ecpmA - ecpmB;
      }
    }),
  ], [columnHelper]);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-12">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Ad Unit Performance Analysis</h2>
          <p className="text-sm text-slate-500 mt-1">広告枠ごとの収益効率を分析します。eCPMが高い枠を優先的に配置することをお勧めします。</p>
        </div>
        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
          Professional Report
        </div>
      </div>

      <DataTable 
        columns={columns as ColumnDef<AdUnitStat, any>[]} 
        data={stats}
        defaultVisibility={{
          ad_type: true,
          ctr: true,
        }}
      />
    </section>
  );
}
