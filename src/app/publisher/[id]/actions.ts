"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";

const PayoutRequestSchema = z.object({
  publisher_id: z.coerce.number().int().positive(),
});

const ProfileUpdateSchema = z.object({
  publisher_id: z.coerce.number().int().positive(),
  category: z.string().optional().nullable().transform(v => v === "" ? null : v),
});

export async function updatePublisherProfile(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const parsed = ProfileUpdateSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    return { success: false, error: "Invalid profile data" };
  }

  const { publisher_id, category } = parsed.data;
  const session = await auth();
  const user = session?.user as any;

  // Authorization check
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== publisher_id)) {
    return { success: false, error: "Forbidden: Access denied" };
  }

  await prisma.publisher.update({
    where: { id: publisher_id },
    data: { category }
  });

  revalidatePath(`/publisher/${publisher_id}`);
  return { success: true };
}

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

  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
    select: { balance: true }
  });

  if (publisher && publisher.balance >= 1000) {
    const amount = publisher.balance;
    await prisma.$transaction(async (tx) => {
      await tx.payout.create({
        data: {
          publisher_id: publisherId,
          amount: amount,
          status: 'pending',
        }
      });
      await tx.publisher.update({
        where: { id: publisherId },
        data: { balance: { decrement: amount } }
      });
    });
    
    revalidatePath(`/publisher/${publisherId}`);
    return { success: true };
  } else {
    return { success: false, error: "Insufficient balance" };
  }
}
