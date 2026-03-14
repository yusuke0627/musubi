"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";

async function checkAuth(advertiserId: number) {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin' && (user?.role !== 'advertiser' || user?.linked_id !== advertiserId)) {
    throw new Error("Forbidden: Access denied");
  }
}

// Zod Schemas
const CampaignSchema = z.object({
  advertiser_id: z.coerce.number().int().positive(),
  name: z.string().min(1, "Name is required").max(100),
  budget: z.coerce.number().nonnegative().default(0),
  start_date: z.string().nullable().optional().transform(v => v === "" ? null : v),
  end_date: z.string().nullable().optional().transform(v => v === "" ? null : v),
});

const AdGroupSchema = z.object({
  advertiser_id: z.coerce.number().int().positive(),
  campaign_id: z.coerce.number().int().positive(),
  name: z.string().min(1, "Name is required").max(100),
  max_bid: z.coerce.number().positive("Bid must be greater than 0"),
  target_device: z.enum(["all", "desktop", "mobile"]),
  target_publishers: z.array(z.string()).optional().default([]),
});

const AdSchema = z.object({
  advertiser_id: z.coerce.number().int().positive(),
  ad_group_id: z.coerce.number().int().positive(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional().default(""),
  image_url: z.string().url("Must be a valid URL"),
  target_url: z.string().url("Must be a valid URL"),
});

// キャンペーン作成
export async function createCampaign(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = CampaignSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid campaign data");
  }

  const { advertiser_id, name, budget, start_date, end_date } = parsed.data;
  await checkAuth(advertiser_id);

  db.prepare('INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?)')
    .run(advertiser_id, name, budget, start_date, end_date);

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// アドグループ作成
export async function createAdGroup(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  // Handle multiple values for target_publishers
  data.target_publishers = formData.getAll("target_publishers") as any;
  const parsed = AdGroupSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad group data");
  }

  const { advertiser_id, campaign_id, name, max_bid, target_device, target_publishers } = parsed.data;
  await checkAuth(advertiser_id);

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;

  db.transaction(() => {
    const result = db.prepare('INSERT INTO ad_groups (campaign_id, name, max_bid, target_device, is_all_publishers) VALUES (?, ?, ?, ?, ?)')
      .run(campaign_id, name, max_bid, target_device, isAll ? 1 : 0);
    
    const adGroupId = result.lastInsertRowid;

    if (!isAll) {
      const insertTarget = db.prepare('INSERT INTO ad_group_target_publishers (ad_group_id, publisher_id) VALUES (?, ?)');
      target_publishers.forEach(pubId => {
        if (pubId !== 'all') {
          insertTarget.run(adGroupId, parseInt(pubId, 10));
        }
      });
    }
  })();

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// 広告作成
export async function createAd(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = AdSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad data");
  }

  const { advertiser_id, ad_group_id, title, description, image_url, target_url } = parsed.data;
  await checkAuth(advertiser_id);

  db.prepare('INSERT INTO ads (ad_group_id, title, description, image_url, target_url, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(ad_group_id, title, description, image_url, target_url, 'pending');

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// キャンペーン更新
export async function updateCampaign(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) throw new Error("Invalid campaign ID");

  const parsed = CampaignSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid campaign data");
  }

  const { advertiser_id, name, budget, start_date, end_date } = parsed.data;
  await checkAuth(advertiser_id);

  db.prepare('UPDATE campaigns SET name = ?, budget = ?, start_date = ?, end_date = ? WHERE id = ?')
    .run(name, budget, start_date, end_date, id);

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// アドグループ更新
export async function updateAdGroup(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) throw new Error("Invalid ad group ID");

  data.target_publishers = formData.getAll("target_publishers") as any;
  const parsed = AdGroupSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad group data");
  }

  const { advertiser_id, campaign_id, name, max_bid, target_device, target_publishers } = parsed.data;
  await checkAuth(advertiser_id);

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;

  db.transaction(() => {
    db.prepare('UPDATE ad_groups SET campaign_id = ?, name = ?, max_bid = ?, target_device = ?, is_all_publishers = ? WHERE id = ?')
      .run(campaign_id, name, max_bid, target_device, isAll ? 1 : 0, id);

    // 既存のターゲット設定を削除して再登録
    db.prepare('DELETE FROM ad_group_target_publishers WHERE ad_group_id = ?').run(id);
    
    if (!isAll) {
      const insertTarget = db.prepare('INSERT INTO ad_group_target_publishers (ad_group_id, publisher_id) VALUES (?, ?)');
      target_publishers.forEach(pubId => {
        if (pubId !== 'all') {
          insertTarget.run(id, parseInt(pubId, 10));
        }
      });
    }
  })();

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// 広告更新 (再審査ロジック付き)
export async function updateAd(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) throw new Error("Invalid ad ID");

  const parsed = AdSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad data");
  }

  const { advertiser_id, ad_group_id, title, description, image_url, target_url } = parsed.data;
  await checkAuth(advertiser_id);

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
