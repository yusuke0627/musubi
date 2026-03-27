"use client";

import { useState, useRef } from "react";
import { createAd } from "@/app/advertiser/[id]/actions";

interface CreateAdFormProps {
  advertiserId: number;
  adGroups: Array<{
    id: number;
    name: string;
    campaign_name: string;
  }>;
}

export default function CreateAdForm({ advertiserId, adGroups }: CreateAdFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit");
        setPreviewUrl(null);
        return;
      }

      // ファイル形式チェック
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Allowed: JPEG, PNG, GIF, WebP");
        setPreviewUrl(null);
        return;
      }

      setError(null);
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

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setError("Please select an image");
      return;
    }

    setIsUploading(true);

    try {
      // 1. 画像をアップロード
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("advertiser_id", advertiserId.toString());

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const uploadResult = await uploadResponse.json();

      // 2. 画像パスをformDataに追加
      formData.append("image_path", uploadResult.path);

      // 3. Server Actionを呼び出し
      await createAd(formData);

      // 4. フォームをリセット
      form.reset();
      setPreviewUrl(null);
      setIsUploading(false);

    } catch (err) {
      setIsUploading(false);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="advertiser_id" value={advertiserId} />
      
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Ad Group</label>
        <select 
          name="ad_group_id" 
          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white" 
          required
        >
          {adGroups.map(g => (
            <option key={g.id} value={g.id}>{g.name} ({g.campaign_name})</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
        <input 
          type="text" 
          name="title" 
          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none" 
          placeholder="Ad Title" 
          required 
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
        <textarea 
          name="description" 
          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm" 
          placeholder="Ad description (optional)" 
          rows={2}
        />
      </div>
      
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Image Upload</label>
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="w-full p-2 border border-gray-200 rounded-lg text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100" 
          required 
        />
        <p className="mt-1 text-[10px] text-gray-500">
          Supported: JPEG, PNG, GIF, WebP (max 5MB)
        </p>
      </div>

      {/* 画像プレビュー */}
      {previewUrl && (
        <div className="border border-gray-200 rounded-lg p-2">
          <p className="text-[10px] text-gray-500 mb-1 font-bold uppercase">Preview</p>
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="max-w-full h-auto max-h-[150px] object-contain rounded"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Target URL</label>
        <input 
          type="url" 
          name="target_url" 
          className="w-full p-2 border border-gray-200 rounded-lg text-xs" 
          placeholder="https://..." 
          required 
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-xs">
          {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={isUploading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </>
        ) : (
          "Publish Ad"
        )}
      </button>
    </form>
  );
}
