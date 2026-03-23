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

const AppSchema = z.object({
  publisher_id: z.coerce.number().int().positive(),
  name: z.string().min(1, "App name is required"),
  domain: z.string().optional().nullable(),
  bundle_id: z.string().optional().nullable(),
  platform: z.enum(["web", "ios", "android"]),
});

const AdUnitSchema = z.object({
  app_id: z.coerce.number().int().positive(),
  name: z.string().min(1, "Unit name is required"),
  ad_type: z.enum(["banner", "interstitial"]),
  width: z.coerce.number().int().positive().nullable().optional(),
  height: z.coerce.number().int().positive().nullable().optional(),
});

export async function createApp(formData: FormData): Promise<void> {
  const data = Object.fromEntries(formData.entries());
  const parsed = AppSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid app data");
  }

  const { publisher_id, name, domain, bundle_id, platform } = parsed.data;
  const session = await auth();
  const user = session?.user as any;

  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== publisher_id)) {
    throw new Error("Forbidden");
  }

  await prisma.app.create({
    data: { publisher_id, name, domain, bundle_id, platform }
  });

  revalidatePath(`/publisher/${publisher_id}`);
}

export async function deleteApp(formData: FormData): Promise<void> {
  const appId = parseInt(formData.get("app_id") as string, 10);
  const publisherId = parseInt(formData.get("publisher_id") as string, 10);
  
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== publisherId)) {
    throw new Error("Forbidden");
  }

  await prisma.app.delete({ where: { id: appId } });
  revalidatePath(`/publisher/${publisherId}`);
}

export async function createAdUnit(formData: FormData): Promise<void> {
  const data = Object.fromEntries(formData.entries());
  const parsed = AdUnitSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid ad unit data");
  }

  const { app_id, name, ad_type, width, height } = parsed.data;
  
  const app = await prisma.app.findUnique({ where: { id: app_id } });
  if (!app) throw new Error("App not found");

  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== app.publisher_id)) {
    throw new Error("Forbidden");
  }

  await prisma.adUnit.create({
    data: { app_id, name, ad_type, width, height }
  });

  revalidatePath(`/publisher/${app.publisher_id}`);
}

export async function deleteAdUnit(formData: FormData): Promise<void> {
  const adUnitId = parseInt(formData.get("ad_unit_id") as string, 10);
  const publisherId = parseInt(formData.get("publisher_id") as string, 10);

  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== publisherId)) {
    throw new Error("Forbidden");
  }

  await prisma.adUnit.delete({ where: { id: adUnitId } });
  revalidatePath(`/publisher/${publisherId}`);
}

export async function updatePublisherProfile(formData: FormData): Promise<void> {
  const data = Object.fromEntries(formData.entries());
  const parsed = ProfileUpdateSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid profile data");
  }

  const { publisher_id, category } = parsed.data;
  const session = await auth();
  const user = session?.user as any;

  // Authorization check
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== publisher_id)) {
    throw new Error("Forbidden: Access denied");
  }

  await prisma.publisher.update({
    where: { id: publisher_id },
    data: { category }
  });

  revalidatePath(`/publisher/${publisher_id}`);
}

export async function requestPayout(formData: FormData): Promise<void> {
  const data = Object.fromEntries(formData.entries());
  const parsed = PayoutRequestSchema.safeParse(data);

  if (!parsed.success) {
    console.error(parsed.error.issues);
    throw new Error("Invalid publisher ID");
  }

  const publisherId = parsed.data.publisher_id;
  const session = await auth();
  const user = session?.user as any;

  // Authorization check
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id !== publisherId)) {
    throw new Error("Forbidden: Access denied");
  }

  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
    select: { balance: true }
  });

  if (!publisher) {
    throw new Error("Publisher not found");
  }

  if (publisher.balance < 1000) {
    throw new Error("Insufficient balance");
  }

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
}
