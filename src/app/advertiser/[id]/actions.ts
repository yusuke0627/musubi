"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

// キャンペーン作成
export async function createCampaign(formData: FormData) {
  const advertiser_id = formData.get("advertiser_id") as string;
  const name = formData.get("name") as string;
  const budget = formData.get("budget") as string;
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;

  db.prepare('INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?)')
    .run(advertiser_id, name, budget || 0, start_date || null, end_date || null);

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// アドグループ作成
export async function createAdGroup(formData: FormData) {
  const advertiser_id = formData.get("advertiser_id") as string;
  const campaign_id = formData.get("campaign_id") as string;
  const name = formData.get("name") as string;
  const max_bid = formData.get("max_bid") as string;
  const target_device = formData.get("target_device") as string;
  const target_publishers = formData.getAll("target_publishers") as string[];

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;

  db.transaction(() => {
    const result = db.prepare('INSERT INTO ad_groups (campaign_id, name, max_bid, target_device, is_all_publishers) VALUES (?, ?, ?, ?, ?)')
      .run(campaign_id, name, max_bid, target_device, isAll ? 1 : 0);
    
    const adGroupId = result.lastInsertRowid;

    if (!isAll) {
      const insertTarget = db.prepare('INSERT INTO ad_group_target_publishers (ad_group_id, publisher_id) VALUES (?, ?)');
      target_publishers.forEach(pubId => {
        insertTarget.run(adGroupId, pubId);
      });
    }
  })();

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// 広告作成
export async function createAd(formData: FormData) {
  const advertiser_id = formData.get("advertiser_id") as string;
  const ad_group_id = formData.get("ad_group_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const image_url = formData.get("image_url") as string;
  const target_url = formData.get("target_url") as string;

  db.prepare('INSERT INTO ads (ad_group_id, title, description, image_url, target_url, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(ad_group_id, title, description, image_url, target_url, 'pending');

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// キャンペーン更新
export async function updateCampaign(formData: FormData) {
  const id = formData.get("id") as string;
  const advertiser_id = formData.get("advertiser_id") as string;
  const name = formData.get("name") as string;
  const budget = formData.get("budget") as string;
  const start_date = formData.get("start_date") as string;
  const end_date = formData.get("end_date") as string;

  db.prepare('UPDATE campaigns SET name = ?, budget = ?, start_date = ?, end_date = ? WHERE id = ?')
    .run(name, budget, start_date, end_date || null, id);

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// アドグループ更新
export async function updateAdGroup(formData: FormData) {
  const id = formData.get("id") as string;
  const advertiser_id = formData.get("advertiser_id") as string;
  const campaign_id = formData.get("campaign_id") as string;
  const name = formData.get("name") as string;
  const max_bid = formData.get("max_bid") as string;
  const target_device = formData.get("target_device") as string;
  const target_publishers = formData.getAll("target_publishers") as string[];

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;

  db.transaction(() => {
    db.prepare('UPDATE ad_groups SET campaign_id = ?, name = ?, max_bid = ?, target_device = ?, is_all_publishers = ? WHERE id = ?')
      .run(campaign_id, name, max_bid, target_device, isAll ? 1 : 0, id);

    // 既存のターゲット設定を削除して再登録
    db.prepare('DELETE FROM ad_group_target_publishers WHERE ad_group_id = ?').run(id);
    
    if (!isAll) {
      const insertTarget = db.prepare('INSERT INTO ad_group_target_publishers (ad_group_id, publisher_id) VALUES (?, ?)');
      target_publishers.forEach(pubId => {
        insertTarget.run(id, pubId);
      });
    }
  })();

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// 広告更新 (再審査ロジック付き)
export async function updateAd(formData: FormData) {
  const id = formData.get("id") as string;
  const advertiser_id = formData.get("advertiser_id") as string;
  const ad_group_id = formData.get("ad_group_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const image_url = formData.get("image_url") as string;
  const target_url = formData.get("target_url") as string;

  // 現在のデータを取得して変更があるか確認
  const current = db.prepare('SELECT * FROM ads WHERE id = ?').get(id) as any;
  
  // 広告審査の再トリガー判定
  const isCreativeChanged = 
    current.title !== title || 
    current.description !== description || 
    current.image_url !== image_url || 
    current.target_url !== target_url;

  const newStatus = isCreativeChanged ? 'pending' : current.status;

  db.prepare('UPDATE ads SET ad_group_id = ?, title = ?, description = ?, image_url = ?, target_url = ?, status = ? WHERE id = ?')
    .run(ad_group_id, title, description, image_url, target_url, newStatus, id);

  revalidatePath(`/advertiser/${advertiser_id}`);
}
