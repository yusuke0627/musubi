"use server";

import prisma from "@/lib/db";
import { runBillingWorker } from "@/services/billing";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";

async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    throw new Error("Forbidden: Admin access required");
  }
}

const CompletePayoutSchema = z.object({
  payout_id: z.coerce.number().int().positive(),
});

const UpdateRevShareSchema = z.object({
  publisher_id: z.coerce.number().int().positive(),
  rev_share: z.coerce.number().min(0).max(1),
});

const ReviewAdSchema = z.object({
  ad_id: z.coerce.number().int().positive(),
  action: z.enum(["approve", "reject"]),
  rejection_reason: z.string().optional().default(""),
});

// クリック確定処理（Billing Worker実行）
export async function processClicks() {
  try {
    await checkAdmin();
    const processedCount = await runBillingWorker();
    revalidatePath("/admin");
    return { success: true, count: processedCount };
  } catch (err) {
    console.error("Billing error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to process clicks" };
  }
}

// 全キャンペーンの日次予算リセット
export async function resetDailyBudgets() {
  try {
    await checkAdmin();
    await prisma.campaign.updateMany({
      data: { today_spent: 0 }
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("Reset error:", err);
    return { success: false, error: "Failed to reset daily budgets" };
  }
}

// 支払い完了処理
export async function completePayout(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = CompletePayoutSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid payout data");
  }

  await checkAdmin();
  const { payout_id } = parsed.data;

  await prisma.payout.update({
    where: { id: payout_id },
    data: { status: 'paid', paid_at: new Date() }
  });

  revalidatePath("/admin");
}

// 報酬率の更新
export async function updateRevShare(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = UpdateRevShareSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid rev_share data");
  }

  await checkAdmin();
  const { publisher_id, rev_share } = parsed.data;

  await prisma.publisher.update({
    where: { id: publisher_id },
    data: { rev_share }
  });

  revalidatePath("/admin");
}

// 広告審査
export async function reviewAd(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = ReviewAdSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid review data");
  }

  await checkAdmin();
  const { ad_id, action, rejection_reason } = parsed.data;
  const status = action === 'approve' ? 'approved' : 'rejected';
  
  await prisma.ad.update({
    where: { id: ad_id },
    data: { 
      status, 
      rejection_reason: status === 'rejected' ? rejection_reason : null 
    }
  });
  
  revalidatePath("/admin");
}
