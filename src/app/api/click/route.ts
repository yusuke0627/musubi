import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ad_id = searchParams.get("ad_id");
  const publisher_id = searchParams.get("publisher_id");
  
  if (!ad_id) {
    return new NextResponse("ad_id is required", { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || req.ip || "unknown";

  try {
    const ad = db.prepare('SELECT target_url FROM ads WHERE id = ?').get(ad_id) as any;
    if (ad) {
      // 未処理のクリックとしてログ挿入
      db.prepare('INSERT INTO clicks (ad_id, publisher_id, user_agent, ip_address, processed) VALUES (?, ?, ?, ?, 0)')
        .run(ad_id, publisher_id, ua, ip);
      
      return NextResponse.redirect(ad.target_url);
    } else {
      return new NextResponse("Ad not found", { status: 404 });
    }
  } catch (err) {
    console.error('Click error:', err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
