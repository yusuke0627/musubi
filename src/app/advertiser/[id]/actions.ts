"use server";

import prisma from "@/lib/db";
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
  const parsed = AdGroupSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad group data");
  }

  const { advertiser_id, campaign_id, name, max_bid, target_device, target_publishers } = parsed.data;
  await checkAuth(advertiser_id);

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;

  await prisma.$transaction(async (tx) => {
    const adGroup = await tx.adGroup.create({
      data: {
        campaign_id,
        name,
        max_bid,
        target_device,
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
  const parsed = AdSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad data");
  }

  const { advertiser_id, ad_group_id, title, description, image_url, target_url } = parsed.data;
  await checkAuth(advertiser_id);

  await prisma.ad.create({
    data: {
      ad_group_id,
      title,
      description,
      image_url,
      target_url,
      status: 'pending',
    }
  });

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
  const parsed = AdGroupSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad group data");
  }

  const { advertiser_id, campaign_id, name, max_bid, target_device, target_publishers } = parsed.data;
  await checkAuth(advertiser_id);

  const isAll = target_publishers.includes('all') || target_publishers.length === 0;

  await prisma.$transaction(async (tx) => {
    await tx.adGroup.update({
      where: { id },
      data: {
        campaign_id,
        name,
        max_bid,
        target_device,
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

  const parsed = AdSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad data");
  }

  const { advertiser_id, ad_group_id, title, description, image_url, target_url } = parsed.data;
  await checkAuth(advertiser_id);

  const current = await prisma.ad.findUnique({
    where: { id }
  });

  if (!current) throw new Error("Ad not found");
  
  const isCreativeChanged = 
    current.title !== title || 
    current.description !== description || 
    current.image_url !== image_url || 
    current.target_url !== target_url;

  const newStatus = isCreativeChanged ? 'pending' : current.status;

  await prisma.ad.update({
    where: { id },
    data: {
      ad_group_id,
      title,
      description,
      image_url,
      target_url,
      status: newStatus,
    }
  });

  revalidatePath(`/advertiser/${advertiser_id}`);
}
