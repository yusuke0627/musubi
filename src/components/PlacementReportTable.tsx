"use client";

import { useMemo } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";

interface PlacementStat {
  id: number;
  name: string;
  domain: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
}

interface PlacementReportTableProps {
  placements: PlacementStat[];
}

export default function PlacementReportTable({ placements }: PlacementReportTableProps) {
  const columnHelper = createColumnHelper<PlacementStat>();

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      id: "publisher",
      header: "Publisher",
      cell: (info) => (
        <div>
          <div className="font-bold text-gray-900 leading-tight">{info.getValue()}</div>
          <div className="text-[10px] text-gray-400">{info.row.original.domain}</div>
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
    }),
    columnHelper.display({
      id: "cpa",
      header: "CPA",
      cell: (info) => {
        const { cost, conversions } = info.row.original;
        const cpa = conversions > 0 ? cost / conversions : 0;
        return <span className="font-mono font-bold text-emerald-700">{cpa > 0 ? `¥${Math.floor(cpa).toLocaleString()}` : '-'}</span>;
      },
    }),
    columnHelper.accessor("revenue", {
      header: "Revenue",
      cell: (info) => <span className="font-mono font-bold text-emerald-700">¥{info.getValue().toLocaleString()}</span>,
    }),
  ], [columnHelper]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Placement Report</h2>
        <p className="text-sm text-gray-500 mt-1">媒体社別のパフォーマンス統計です。</p>
      </div>

      <DataTable 
        columns={columns as ColumnDef<PlacementStat, any>[]} 
        data={placements} 
      />
    </section>
  );
}
