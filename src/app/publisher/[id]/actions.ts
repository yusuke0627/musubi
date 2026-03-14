"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";

const PayoutRequestSchema = z.object({
  publisher_id: z.coerce.number().int().positive(),
});

export async function requestPayout(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = PayoutRequestSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    return { success: false, error: "Invalid publisher ID" };
  }

  const publisherId = parsed.data.publisher_id;
  const session = await auth();
  const user = session?.user as any;

  // Authorization check
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== publisherId)) {
    return { success: false, error: "Forbidden: Access denied" };
  }

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
