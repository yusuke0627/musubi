"use client";

import { useState } from "react";
import EditModal from "./EditModal";

interface Campaign {
  id: number;
  name: string;
  budget: number;
  start_date: string;
  end_date?: string;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  advertiserId: string;
}

export default function CampaignsTable({ campaigns, advertiserId }: CampaignsTableProps) {
  const [editModal, setEditModal] = useState<{ isOpen: boolean; data: any }>({ isOpen: false, data: null });

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <EditModal 
        isOpen={editModal.isOpen} 
        onClose={() => setEditModal({ ...editModal, isOpen: false })} 
        advertiserId={advertiserId}
        type="campaign"
        data={editModal.data}
      />
      <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Campaigns</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Duration</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors text-sm">
                <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">¥{c.budget.toLocaleString()}</td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  <div className="font-bold">{new Date(c.start_date).toLocaleDateString()}</div>
                  <div className="text-[10px]">to {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Endless'}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => setEditModal({ isOpen: true, data: c })} className="text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
