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

  let publisherIds = 'all';
  if (target_publishers && target_publishers.length > 0) {
    if (target_publishers.includes('all')) {
      publisherIds = 'all';
    } else {
      publisherIds = target_publishers.join(',');
    }
  }

  db.prepare('INSERT INTO ad_groups (campaign_id, name, max_bid, target_device, target_publisher_ids) VALUES (?, ?, ?, ?, ?)')
    .run(campaign_id, name, max_bid, target_device, publisherIds);

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
