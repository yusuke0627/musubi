import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// 1x1 Transparent GIF pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adId = searchParams.get("ad_id");
  const adUnitId = searchParams.get("ad_unit_id");

  if (!adId || !adUnitId) {
    return new NextResponse("Missing parameters", { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  try {
    // ad_unit_id から publisher_id を特定する
    const adUnit = await prisma.adUnit.findUnique({
      where: { id: parseInt(adUnitId, 10) },
      include: { app: true }
    });

    if (adUnit) {
      // Record the actual impression
      await prisma.impression.create({
        data: {
          ad_id: parseInt(adId, 10),
          publisher_id: adUnit.app.publisher_id,
          ad_unit_id: adUnit.id,
          user_agent: ua,
          ip_address: ip,
        }
      });
    }
  } catch (error) {
    console.error("Impression tracking error:", error);
    // Even if DB fails, return the pixel so the browser doesn't retry or show broken image
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    },
  });
}
