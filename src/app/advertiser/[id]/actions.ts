"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// 画像アップロード処理
export async function uploadImage(formData: FormData) {
  const file = formData.get("image") as File;
  const advertiserId = formData.get("advertiser_id") as string;
  
  if (!file || !advertiserId) {
    throw new Error("Missing file or advertiser_id");
  }
  
  await checkAuth(parseInt(advertiserId, 10));
  
  // ファイルタイプチェック
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }
  
  // ファイルサイズチェック (5MB以下)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5MB");
  }
  
  // 保存先ディレクトリ作成
  const uploadDir = join(process.cwd(), "public", "uploads", "ads", advertiserId);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  
  // ファイル名生成（タイムスタンプ + オリジナル名）
  const timestamp = Date.now();
  const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${timestamp}_${originalName}`;
  const filepath = join(uploadDir, filename);
  
  // ファイル保存
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));
  
  // 公開パスを返す
  return `/uploads/ads/${advertiserId}/${filename}`;
}

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
  daily_budget: z.coerce.number().nonnegative().default(0),
  start_date: z.string().nullable().optional().transform(v => v === "" ? null : v),
  end_date: z.string().nullable().optional().transform(v => v === "" ? null : v),
});

const AdGroupSchema = z.object({
  advertiser_id: z.coerce.number().int().positive(),
  campaign_id: z.coerce.number().int().positive(),
  name: z.string().min(1, "Name is required").max(100),
  max_bid: z.coerce.number().positive("Bid must be greater than 0"),
  target_device: z.enum(["all", "desktop", "mobile"]),
  target_category: z.string().optional().nullable().transform(v => v === "" ? null : v),
  target_publishers: z.array(z.string()).optional().default([]),
  target_os: z.array(z.string()).optional().default([]),
});

const AdSchema = z.object({
  advertiser_id: z.coerce.number().int().positive(),
  ad_group_id: z.coerce.number().int().positive(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional().default(""),
  image_path: z.string().min(1, "Image path is required"),
  target_url: z.string().url("Must be a valid URL"),
});

const ConversionRuleSchema = z.object({
  advertiser_id: z.coerce.number().int().positive(),
  url_pattern: z.string().min(1, "URL pattern is required"),
  name: z.string().min(1, "Name is required"),
  label: z.string().optional().default("macro"),
  revenue: z.coerce.number().min(0).default(0),
});

// キャンペーン作成
export async function createCampaign(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = CampaignSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid campaign data");
  }

  const { advertiser_id, name, budget, daily_budget, start_date, end_date } = parsed.data;
  await checkAuth(advertiser_id);

  await prisma.campaign.create({
    data: {
      advertiser_id,
      name,
      budget,
      daily_budget,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : null,
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// アドグループ作成
export async function createAdGroup(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  data.target_publishers = formData.getAll("target_publishers") as any;
  data.target_os = formData.getAll("target_os") as any;
  const parsed = AdGroupSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad group data");
  }

  const { advertiser_id, campaign_id, name, max_bid, target_device, target_category, target_publishers, target_os } = parsed.data;
  await checkAuth(advertiser_id);

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;
  const targetingJson = target_os.length > 0 ? JSON.stringify({ os: target_os }) : null;

  await prisma.$transaction(async (tx) => {
    const adGroup = await tx.adGroup.create({
      data: {
        campaign_id,
        name,
        max_bid,
        target_device,
        target_category,
        targeting: targetingJson,
        is_all_publishers: isAll ? 1 : 0,
      }
    });

    if (!isAll) {
      for (const pubId of target_publishers) {
        if (pubId !== 'all') {
          await tx.adGroupTargetPublisher.create({
            data: {
              ad_group_id: adGroup.id,
              publisher_id: parseInt(pubId, 10),
            }
          });
        }
      }
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// 広告作成
export async function createAd(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  
  // ファイルアップロード処理
  const imageFile = formData.get("image") as File;
  let image_path = data.image_path as string;
  
  if (imageFile && imageFile.size > 0) {
    const uploadFormData = new FormData();
    uploadFormData.append("image", imageFile);
    uploadFormData.append("advertiser_id", data.advertiser_id as string);
    image_path = await uploadImage(uploadFormData);
  }
  
  const parsed = AdSchema.safeParse({ ...data, image_path });

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad data");
  }

  const { advertiser_id, ad_group_id, title, description, target_url } = parsed.data;
  await checkAuth(advertiser_id);

  await prisma.ad.create({
    data: {
      ad_group_id,
      title,
      description,
      image_path,
      target_url,
      review_status: 'pending',
      status: 'ACTIVE',
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// CVルール作成
export async function createConversionRule(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = ConversionRuleSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid conversion rule data");
  }

  const { advertiser_id, url_pattern, name, label, revenue } = parsed.data;
  await checkAuth(advertiser_id);

  await prisma.conversionRule.create({
    data: {
      advertiser_id,
      url_pattern,
      name,
      label,
      revenue,
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// CVルール削除
export async function deleteConversionRule(formData: FormData) {
  const advertiserId = parseInt(formData.get("advertiser_id") as string, 10);
  const ruleId = parseInt(formData.get("rule_id") as string, 10);

  await checkAuth(advertiserId);

  await prisma.conversionRule.delete({
    where: { id: ruleId }
  });

  revalidatePath(`/advertiser/${advertiserId}`);
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

  const { advertiser_id, name, budget, daily_budget, start_date, end_date } = parsed.data;
  await checkAuth(advertiser_id);

  await prisma.campaign.update({
    where: { id },
    data: {
      name,
      budget,
      daily_budget,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : null,
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// アドグループ更新
export async function updateAdGroup(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) throw new Error("Invalid ad group ID");

  data.target_publishers = formData.getAll("target_publishers") as any;
  data.target_os = formData.getAll("target_os") as any;
  const parsed = AdGroupSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad group data");
  }

  const { advertiser_id, campaign_id, name, max_bid, target_device, target_category, target_publishers, target_os } = parsed.data;
  await checkAuth(advertiser_id);

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;
  const targetingJson = target_os.length > 0 ? JSON.stringify({ os: target_os }) : null;

  await prisma.$transaction(async (tx) => {
    await tx.adGroup.update({
      where: { id },
      data: {
        campaign_id,
        name,
        max_bid,
        target_device,
        target_category,
        targeting: targetingJson,
        is_all_publishers: isAll ? 1 : 0,
      }
    });

    await tx.adGroupTargetPublisher.deleteMany({
      where: { ad_group_id: id }
    });
    
    if (!isAll) {
      for (const pubId of target_publishers) {
        if (pubId !== 'all') {
          await tx.adGroupTargetPublisher.create({
            data: {
              ad_group_id: id,
              publisher_id: parseInt(pubId, 10),
            }
          });
        }
      }
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}

// 広告更新 (再審査ロジック付き)
export async function updateAd(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const id = parseInt(data.id as string, 10);
  if (isNaN(id)) throw new Error("Invalid ad ID");

  // ファイルアップロード処理
  const imageFile = formData.get("image") as File;
  let image_path = data.image_path as string;
  
  if (imageFile && imageFile.size > 0) {
    const uploadFormData = new FormData();
    uploadFormData.append("image", imageFile);
    uploadFormData.append("advertiser_id", data.advertiser_id as string);
    image_path = await uploadImage(uploadFormData);
  }

  const parsed = AdSchema.safeParse({ ...data, image_path });

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad data");
  }

  const { advertiser_id, ad_group_id, title, description, target_url } = parsed.data;
  await checkAuth(advertiser_id);

  const current = await prisma.ad.findUnique({
    where: { id }
  });

  if (!current) throw new Error("Ad not found");
  
  const isCreativeChanged = 
    current.title !== title || 
    current.description !== description || 
    current.image_path !== image_path || 
    current.target_url !== target_url;

  const newStatus = isCreativeChanged ? 'pending' : current.review_status;

  await prisma.ad.update({
    where: { id },
    data: {
      ad_group_id,
      title,
      description,
      image_path,
      target_url,
      review_status: newStatus,
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}
