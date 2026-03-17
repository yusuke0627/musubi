"use client";

import { useState, useMemo } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import EditModal from "./EditModal";

interface AdGroup {
  id: number;
  campaign_id: number;
  campaign_name: string;
  name: string;
  max_bid: number;
  target_device: string;
  conversions: number;
  revenue: number;
}

interface AdGroupsTableProps {
  adGroups: AdGroup[];
  campaigns: any[];
  advertiserId: string;
}

export default function AdGroupsTable({ adGroups, campaigns, advertiserId }: AdGroupsTableProps) {
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

  const columnHelper = createColumnHelper<AdGroup>();

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => <span className="font-bold text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor("campaign_name", {
      header: "Campaign",
      cell: (info) => <span className="text-gray-600 italic text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor("max_bid", {
      header: "Max Bid",
      cell: (info) => <span className="font-mono font-bold text-slate-700 whitespace-nowrap">¥{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor("target_device", {
      header: "Device",
      cell: (info) => <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{info.getValue()}</span>,
    }),
    columnHelper.accessor("conversions", {
      header: "CV",
      cell: (info) => <span className="font-mono font-bold text-blue-700">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor("revenue", {
      header: "Revenue",
      cell: (info) => <span className="font-mono font-bold text-emerald-700 whitespace-nowrap">¥{info.getValue().toLocaleString()}</span>,
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
        type="adGroup"
        data={editModal.data}
        campaigns={campaigns}
      />
      <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Ad Groups Performance</h2>
      </div>

      <DataTable 
        columns={columns as ColumnDef<AdGroup, any>[]} 
        data={adGroups} 
      />
    </section>
  );
}
