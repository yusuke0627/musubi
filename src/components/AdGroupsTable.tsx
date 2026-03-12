"use client";

import { useState } from "react";
import EditModal from "./EditModal";

interface AdGroup {
  id: number;
  campaign_id: number;
  campaign_name: string;
  name: string;
  max_bid: number;
  target_device: string;
}

interface AdGroupsTableProps {
  adGroups: AdGroup[];
  campaigns: any[];
  advertiserId: string;
}

export default function AdGroupsTable({ adGroups, campaigns, advertiserId }: AdGroupsTableProps) {
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

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
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Ad Groups</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Max Bid</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Device</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adGroups.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50 transition-colors text-sm">
                <td className="px-6 py-4 font-bold text-gray-900">{g.name}</td>
                <td className="px-6 py-4 text-gray-600 italic">{g.campaign_name}</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">¥{g.max_bid}</td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{g.target_device}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => setEditModal({ isOpen: true, data: g })} className="text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
