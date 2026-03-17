import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adIdParam = searchParams.get("ad_id");
  const publisherIdParam = searchParams.get("publisher_id");
  
  if (!adIdParam) {
    return new NextResponse("ad_id is required", { status: 400 });
  }

  const adId = parseInt(adIdParam, 10);
  const publisherId = publisherIdParam ? parseInt(publisherIdParam, 10) : 0;
  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  try {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { target_url: true }
    });

    if (ad) {
      const clickId = crypto.randomUUID();

      // 未処理のクリックとしてログ挿入
      await prisma.click.create({
        data: {
          click_id: clickId,
          ad_id: adId,
          publisher_id: publisherId,
          user_agent: ua,
          ip_address: ip,
          processed: 0,
        }
      });
      
      const targetUrl = new URL(ad.target_url);
      targetUrl.searchParams.set("click_id", clickId);
      
      return NextResponse.redirect(targetUrl.toString());
    } else {
      return new NextResponse("Ad not found", { status: 404 });
    }
  } catch (err) {
    console.error('Click error:', err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
