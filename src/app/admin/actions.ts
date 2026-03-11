"use server";

import db from "@/lib/db";
import { runBillingWorker } from "@/services/billing";
import { revalidatePath } from "next/cache";

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
  const payout_id = formData.get("payout_id") as string;
  db.prepare('UPDATE payouts SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('paid', payout_id);
  revalidatePath("/admin");
}

// 報酬率の更新
export async function updateRevShare(formData: FormData) {
  const publisher_id = formData.get("publisher_id") as string;
  const rev_share = formData.get("rev_share") as string;
  db.prepare('UPDATE publishers SET rev_share = ? WHERE id = ?')
    .run(parseFloat(rev_share), publisher_id);
  revalidatePath("/admin");
}

// 広告審査
export async function reviewAd(formData: FormData) {
  const ad_id = formData.get("ad_id") as string;
  const action = formData.get("action") as string;
  const rejection_reason = formData.get("rejection_reason") as string;
  const status = action === 'approve' ? 'approved' : 'rejected';
  
  db.prepare('UPDATE ads SET status = ?, rejection_reason = ? WHERE id = ?')
    .run(status, status === 'rejected' ? rejection_reason : null, ad_id);
  
  revalidatePath("/admin");
}
