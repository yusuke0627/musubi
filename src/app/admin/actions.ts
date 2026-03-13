"use server";

import db from "@/lib/db";
import { runBillingWorker } from "@/services/billing";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    const processedCount = runBillingWorker();
    revalidatePath("/admin");
    return { success: true, count: processedCount };
  } catch (err) {
    console.error("Billing error:", err);
    return { success: false, error: "Failed to process clicks" };
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

  const { payout_id } = parsed.data;

  db.prepare('UPDATE payouts SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('paid', payout_id);
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

  const { publisher_id, rev_share } = parsed.data;

  db.prepare('UPDATE publishers SET rev_share = ? WHERE id = ?')
    .run(rev_share, publisher_id);
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

  const { ad_id, action, rejection_reason } = parsed.data;
  const status = action === 'approve' ? 'approved' : 'rejected';
  
  db.prepare('UPDATE ads SET status = ?, rejection_reason = ? WHERE id = ?')
    .run(status, status === 'rejected' ? rejection_reason : null, ad_id);
  
  revalidatePath("/admin");
}
