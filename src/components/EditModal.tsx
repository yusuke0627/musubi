"use client";

import { updateCampaign, updateAdGroup, updateAd } from "@/app/advertiser/[id]/actions";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  advertiserId: string;
  type: "campaign" | "adGroup" | "ad";
  data: any;
  campaigns?: any[];
  adGroups?: any[];
}

export default function EditModal({ isOpen, onClose, advertiserId, type, data, campaigns = [], adGroups = [] }: EditModalProps) {
  if (!isOpen) return null;

  const handleSubmit = async (formData: FormData) => {
    if (type === "campaign") await updateCampaign(formData);
    else if (type === "adGroup") await updateAdGroup(formData);
    else if (type === "ad") await updateAd(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Edit {type === 'adGroup' ? 'Ad Group' : type.charAt(0).toUpperCase() + type.slice(1)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>

        <form action={handleSubmit} className="p-6 space-y-4">
          <input type="hidden" name="id" value={data.id} />
          <input type="hidden" name="advertiser_id" value={advertiserId} />

          {type === "campaign" && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Campaign Name</label>
                <input type="text" name="name" defaultValue={data.name || data.campaign_name} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 font-medium" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Start Date</label>
                  <input type="date" name="start_date" defaultValue={data.start_date?.split(' ')[0]} className="w-full p-2 border rounded-lg text-sm text-slate-900 font-medium" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">End Date</label>
                  <input type="date" name="end_date" defaultValue={data.end_date?.split(' ')[0]} className="w-full p-2 border rounded-lg text-sm text-slate-900 font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Total Budget (¥)</label>
                  <input type="number" name="budget" defaultValue={data.budget} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 font-medium" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Daily Budget (¥)</label>
                  <input type="number" name="daily_budget" defaultValue={data.daily_budget} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 font-medium" required />
                </div>
              </div>
            </>
          )}

          {type === "adGroup" && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Parent Campaign</label>
                <select name="campaign_id" defaultValue={data.campaign_id} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 bg-white text-slate-900 font-medium" required>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Group Name</label>
                <input type="text" name="name" defaultValue={data.name || data.group_name} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 text-slate-900 font-medium" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Max Bid (¥)</label>
                <input type="number" name="max_bid" defaultValue={data.max_bid} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 text-slate-900 font-medium font-mono" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Device</label>
                <div className="flex gap-4">
                  {['all', 'desktop', 'mobile'].map(d => (
                    <label key={d} className="inline-flex items-center text-sm font-medium text-slate-700">
                      <input type="radio" name="target_device" value={d} defaultChecked={data.target_device === d} className="mr-1 accent-emerald-600" /> {d.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === "ad" && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ad Group (Parent)</label>
                <select name="ad_group_id" defaultValue={data.ad_group_id} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 bg-white text-slate-900 font-medium" required>
                  {adGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.campaign_name})</option>)}
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg mb-4 text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold block mb-1 text-xs">⚠️ Re-review Warning</span>
                Changing the title, description, image, or URL will set this ad to <strong>PENDING</strong> and require manual approval before serving.
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input type="text" name="title" defaultValue={data.title} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea name="description" defaultValue={data.description} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Image URL</label>
                <input type="url" name="image_url" defaultValue={data.image_url} className="w-full p-2 border rounded-lg text-xs text-slate-900 font-medium" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Target URL</label>
                <input type="url" name="target_url" defaultValue={data.target_url} className="w-full p-2 border rounded-lg text-xs text-slate-900 font-medium" required />
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className={`flex-1 px-4 py-2 rounded-lg font-bold text-white shadow-lg transition-colors ${
              type === 'campaign' ? 'bg-slate-800 hover:bg-slate-700' :
              type === 'adGroup' ? 'bg-emerald-600 hover:bg-emerald-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
