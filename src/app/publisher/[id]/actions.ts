"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function requestPayout(formData: FormData) {
  const publisherId = formData.get("publisher_id") as string;
  const publisher = db.prepare('SELECT balance FROM publishers WHERE id = ?').get(publisherId) as any;

  if (publisher && publisher.balance >= 1000) {
    db.transaction(() => {
      const amount = publisher.balance;
      db.prepare('INSERT INTO payouts (publisher_id, amount, status) VALUES (?, ?, ?)')
        .run(publisherId, amount, 'pending');
      db.prepare('UPDATE publishers SET balance = balance - ? WHERE id = ?')
        .run(amount, publisherId);
    })();
    revalidatePath(`/publisher/${publisherId}`);
    return { success: true };
  } else {
    return { success: false, error: "Insufficient balance" };
  }
}
