'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerPublisher, RegistrationResult } from './actions';
import type { PublisherRegistrationInput } from '@/lib/schemas/publisher';

export default function PublisherRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [formData, setFormData] = useState<PublisherRegistrationInput & { confirm_password: string }>({
    name: '',
    category: '',
    email: '',
    phone: '',
    address: '',
    contact_name: '',
    entity_type: 'individual',
    bank_name: '',
    bank_branch: '',
    account_type: 'checking',
    account_number: '',
    account_name: '',
    password: '',
    confirm_password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    const res = await registerPublisher(formData);
    setResult(res);
    setIsLoading(false);

    if (res.success) {
      router.push(`/publisher/${res.publisherId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">媒体登録</h1>
        <p className="text-gray-500 mb-8">広告配信を開始するには以下の情報を入力してください</p>

        {result?.error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {result.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">媒体名 *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="例：テックブログMedia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="例：テクノロジー"
                />
              </div>
            </div>
          </section>

          {/* 連絡先 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">連絡先</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="contact@example.com"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">電話番号 *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                    placeholder="03-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当者名 *</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                    placeholder="山田太郎"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">住所 *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="東京都渋谷区..."
                />
              </div>
            </div>
          </section>

          {/* 法人情報 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">法人情報</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">法人/個人 *</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="entity_type"
                    value="individual"
                    checked={formData.entity_type === 'individual'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  個人
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="entity_type"
                    value="corporation"
                    checked={formData.entity_type === 'corporation'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  法人
                </label>
              </div>
            </div>
          </section>

          {/* 振込先 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">振込先口座</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">銀行名 *</label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="みずほ銀行"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支店名 *</label>
                <input
                  type="text"
                  name="bank_branch"
                  value={formData.bank_branch}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="渋谷支店"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">口座種別 *</label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                >
                  <option value="checking">普通</option>
                  <option value="savings">当座</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">口座番号 *</label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="1234567"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">口座名義 *</label>
              <input
                type="text"
                name="account_name"
                value={formData.account_name}
                onChange={handleChange}
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                placeholder="ヤマダタロウ"
              />
            </div>
          </section>

          {/* ログイン情報 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">ログイン情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="8文字以上"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード確認 *</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                  placeholder="再度入力"
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登録中...' : '登録する'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          既にアカウントをお持ちですか？{' '}
          <Link href="/login" className="text-slate-900 font-semibold hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
