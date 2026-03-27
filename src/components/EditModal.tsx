"use client";

import { useState, useRef } from "react";
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
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(data?.image_path || null);
  const [error, setError] = useState<string | null>(null);
  const [hasNewImage, setHasNewImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit");
        return;
      }

      // ファイル形式チェック
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Allowed: JPEG, PNG, GIF, WebP");
        return;
      }

      setError(null);
      setHasNewImage(true);
      // プレビュー表示
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // 広告編集時で新しい画像が選択されている場合
      if (type === "ad" && hasNewImage && fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0];
        
        // 画像をアップロード
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("advertiser_id", advertiserId);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload image");
        }

        const uploadResult = await uploadResponse.json();
        formData.append("image_path", uploadResult.path);
      } else if (type === "ad") {
        // 新しい画像がない場合は既存のパスを使用
        formData.append("image_path", data.image_path || "");
      }

      // Server Actionを呼び出し
      if (type === "campaign") await updateCampaign(formData);
      else if (type === "adGroup") await updateAdGroup(formData);
      else if (type === "ad") await updateAd(formData);
      
      setIsUploading(false);
      onClose();
    } catch (err) {
      setIsUploading(false);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Target Category</label>
                <select name="target_category" defaultValue={data.target_category || ""} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 bg-white text-slate-900 font-medium">
                  <option value="">Any Category</option>
                  <option value="anime">Anime & Manga</option>
                  <option value="game">Games</option>
                  <option value="tech">Technology</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Device</label>
                <div className="flex gap-4">
                  {['all', 'desktop', 'mobile'].map(d => (
                    <label key={d} className="inline-flex items-center text-sm font-medium text-slate-700">
                      <input type="radio" name="target_device" value={d} defaultChecked={data.target_device === d} className="mr-1 accent-emerald-600" /> {d.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target OS (Optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    let selectedOs: string[] = [];
                    try {
                      if (data.targeting) {
                        const parsed = typeof data.targeting === 'string' ? JSON.parse(data.targeting) : data.targeting;
                        selectedOs = parsed.os || [];
                      }
                    } catch (e) {
                      console.error("Failed to parse targeting", e);
                    }

                    return ['iOS', 'Android', 'Windows', 'macOS', 'Other'].map(os => (
                      <label key={os} className="inline-flex items-center text-sm font-medium text-slate-700">
                        <input 
                          type="checkbox" 
                          name="target_os" 
                          value={os} 
                          defaultChecked={selectedOs.includes(os)} 
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                        /> {os}
                      </label>
                    ));
                  })()}
                </div>
                <p className="mt-1 text-[10px] text-slate-500 italic">If none selected, all OS will be targeted.</p>
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Image Upload</label>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="w-full p-2 border rounded-lg text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" 
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Select new image to replace. Supported: JPEG, PNG, GIF, WebP (max 5MB)
                </p>
              </div>
              {/* 画像プレビュー */}
              {previewUrl && (
                <div className="border border-gray-200 rounded-lg p-2">
                  <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase">
                    {hasNewImage ? "New Preview" : "Current Image"}
                  </p>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full h-auto max-h-[150px] object-contain rounded"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Target URL</label>
                <input type="url" name="target_url" defaultValue={data.target_url} className="w-full p-2 border rounded-lg text-xs text-slate-900 font-medium" required />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isUploading}
              className={`flex-1 px-4 py-2 rounded-lg font-bold text-white shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                type === 'campaign' ? 'bg-slate-800 hover:bg-slate-700' :
                type === 'adGroup' ? 'bg-emerald-600 hover:bg-emerald-700' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
