import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adIdParam = searchParams.get("ad_id");
  const adUnitIdParam = searchParams.get("ad_unit_id");
  
  if (!adIdParam || !adUnitIdParam) {
    return new NextResponse("ad_id and ad_unit_id are required", { status: 400 });
  }

  const adId = parseInt(adIdParam, 10);
  const adUnitId = parseInt(adUnitIdParam, 10);
  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  try {
    const [ad, adUnit] = await Promise.all([
      prisma.ad.findUnique({
        where: { id: adId },
        include: { adGroup: { include: { campaign: true } } }
      }),
      prisma.adUnit.findUnique({
        where: { id: adUnitId },
        include: { app: true }
      })
    ]);

    if (ad && adUnit) {
      const clickId = crypto.randomUUID();

      // 未処理のクリックとしてログ挿入
      await prisma.click.create({
        data: {
          click_id: clickId,
          ad_id: adId,
          publisher_id: adUnit.app.publisher_id,
          ad_unit_id: adUnitId,
          campaign_id: ad.adGroup.campaign.id,
          cost: ad.adGroup.max_bid,
          publisher_earnings: ad.adGroup.max_bid * 0.7, // Assume 70% share
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
