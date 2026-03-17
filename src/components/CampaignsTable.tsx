"use client";

import { useState } from "react";
import EditModal from "./EditModal";

interface Campaign {
  id: number;
  name: string;
  budget: number;
  daily_budget: number;
  start_date: string | Date;
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
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Campaigns Performance</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Budget (Total / Daily)</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Duration</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-400 uppercase tracking-widest">CV</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-emerald-400 uppercase tracking-widest">Revenue</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors text-sm">
                <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-right">
                  <div className="font-mono font-bold text-slate-700">¥{c.budget.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Daily: ¥{c.daily_budget.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                  <div className="font-bold">{new Date(c.start_date).toLocaleDateString('ja-JP')}</div>
                  <div className="text-[10px]">to {c.end_date ? new Date(c.end_date).toLocaleDateString('ja-JP') : 'Endless'}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-blue-700">
                  {c.conversions.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                  ¥{c.revenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => setEditModal({ isOpen: true, data: c })} 
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No campaigns found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
