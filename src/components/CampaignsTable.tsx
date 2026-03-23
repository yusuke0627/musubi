"use client";

import { useState, useMemo } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import EditModal from "./EditModal";

interface Campaign {
  id: number;
  name: string;
  budget: number;
  daily_budget: number;
  start_date: string | Date | null;
  end_date?: string | Date | null;
  conversions: number;
  revenue: number;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  advertiserId: string;
}

export default function CampaignsTable({ campaigns, advertiserId }: CampaignsTableProps) {
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

  const columnHelper = createColumnHelper<Campaign>();

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => <span className="font-bold text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor("budget", {
      header: "Budget (Total / Daily)",
      cell: (info) => (
        <div className="text-right">
          <div className="font-mono font-bold text-slate-700">¥{info.getValue().toLocaleString()}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Daily: ¥{info.row.original.daily_budget.toLocaleString()}</div>
        </div>
      ),
    }),
    columnHelper.accessor("start_date", {
      header: "Duration",
      cell: (info) => {
        const startDate = info.getValue();
        return (
          <div className="text-xs text-gray-500 whitespace-nowrap">
            <div className="font-bold">
              {startDate ? new Date(startDate).toLocaleDateString('ja-JP') : 'Not set'}
            </div>
            <div className="text-[10px]">to {info.row.original.end_date ? new Date(info.row.original.end_date).toLocaleDateString('ja-JP') : 'Endless'}</div>
          </div>
        );
      },
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
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-colors"
        >
          Edit
        </button>
      ),
    }),
  ], [columnHelper]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <EditModal 
        isOpen={editModal.isOpen} 
        onClose={() => setEditModal({ ...editModal, isOpen: false })} 
        advertiserId={advertiserId}
        type="campaign"
        data={editModal.data}
      />
      <div className="p-6 border-b border-gray-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Campaigns Performance</h2>
      </div>

      <DataTable 
        columns={columns as ColumnDef<Campaign, any>[]} 
        data={campaigns} 
      />
    </section>
  );
}
