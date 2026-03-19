import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adUnitIdParam = searchParams.get("ad_unit_id");
  
  if (!adUnitIdParam) {
    return new NextResponse("ad_unit_id is required", { status: 400 });
  }

  const adUnitId = parseInt(adUnitIdParam, 10);
  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // Get AdUnit and Publisher details
  const adUnit = await prisma.adUnit.findUnique({
    where: { id: adUnitId },
    include: { app: { include: { publisher: true } } }
  });

  if (!adUnit) {
    return new NextResponse("Ad Unit not found", { status: 404 });
  }

  const publisherId = adUnit.app.publisher_id;
  const publisherCategory = adUnit.app.publisher.category;
  
  // 簡易デバイス判定
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const currentDevice = isMobile ? 'mobile' : 'desktop';

  // 現在の時刻、曜日、時間を取得
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  // RTB版：期待収益（eCPM）に基づき、最も収益性が高い承認済み広告を1件取得
  const ads = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH ad_stats AS (
      SELECT 
        ads.id,
        ad_groups.max_bid,
        (SELECT COUNT(*) FROM impressions WHERE ad_id = ads.id) as imps,
        (SELECT COUNT(*) FROM clicks WHERE ad_id = ads.id AND is_valid = 1) as valid_clicks
      FROM ads
      JOIN ad_groups ON ads.ad_group_id = ad_groups.id
      JOIN campaigns ON ad_groups.campaign_id = campaigns.id
      JOIN advertisers ON campaigns.advertiser_id = advertisers.id
      WHERE ads.status = 'approved'
        AND advertisers.balance >= ad_groups.max_bid
        -- カテゴリマッチング
        AND (
          ad_groups.target_category IS NULL 
          OR ad_groups.target_category = ''
          OR ad_groups.target_category = ${publisherCategory}
        )
        -- キャンペーン予算チェック (Total)
        AND (campaigns.budget = 0 OR campaigns.spent < campaigns.budget)
        -- キャンペーン予算チェック (Daily) - 高速なカラム比較に変更
        AND (campaigns.daily_budget = 0 OR campaigns.today_spent < campaigns.daily_budget)
        AND (ad_groups.target_device = 'all' OR ad_groups.target_device = ${currentDevice})
        -- 配信先チェック (is_all_publishers または 中間テーブルに存在するか)
        AND (
          ad_groups.is_all_publishers = 1
          OR EXISTS (
            SELECT 1 FROM ad_group_target_publishers 
            WHERE ad_group_id = ad_groups.id AND publisher_id = ${publisherId}
          )
        )
        -- 期間チェック
        AND (campaigns.start_date IS NULL OR campaigns.start_date <= ${now})
        AND (campaigns.end_date IS NULL OR campaigns.end_date >= ${now})
        -- スケジュールチェック
        AND (
          NOT EXISTS (SELECT 1 FROM ad_schedules WHERE ad_group_id = ad_groups.id)
          OR EXISTS (
            SELECT 1 FROM ad_schedules 
            WHERE ad_group_id = ad_groups.id 
              AND day_of_week = ${dayOfWeek} 
              AND start_hour <= ${hour} 
              AND end_hour >= ${hour}
          )
        )
    )
    SELECT ads.*, ad_groups.max_bid,
      CASE 
        WHEN s.imps < 5 THEN ad_groups.max_bid * 0.01
        ELSE ad_groups.max_bid * (CAST(s.valid_clicks AS REAL) / s.imps)
      END as score
    FROM ads
    JOIN ad_groups ON ads.ad_group_id = ad_groups.id
    JOIN ad_stats s ON ads.id = s.id
    ORDER BY score DESC, ads.id DESC
    LIMIT 1
  `);

  const ad = ads[0];

  if (!ad) {
    return new NextResponse(null, { status: 204 });
  }

  // Reactコンポーネントを使用して安全なHTMLを生成 (自動エスケープによるXSS対策)
  const { renderToStaticMarkup } = await import('react-dom/server');
  const AdCreative = (await import('@/components/AdCreative')).default;
  
  // Safe URL building
  const clickUrlObj = new URL(`${new URL(req.url).origin}/api/click`);
  clickUrlObj.searchParams.set("ad_id", ad.id.toString());
  clickUrlObj.searchParams.set("ad_unit_id", adUnitId.toString());
  const clickUrl = clickUrlObj.toString();

  // Tracking Pixel URL
  const pixelUrlObj = new URL(`${new URL(req.url).origin}/api/impression`);
  pixelUrlObj.searchParams.set("ad_id", ad.id.toString());
  pixelUrlObj.searchParams.set("ad_unit_id", adUnitId.toString());
  const pixelUrl = pixelUrlObj.toString();

  const adHtml = renderToStaticMarkup(
    <>
      <AdCreative ad={ad} clickUrl={clickUrl} />
      <img 
        src={pixelUrl} 
        width="1" 
        height="1" 
        style={{ display: 'none' }} 
        alt="" 
      />
    </>
  );

  return new NextResponse(`<!DOCTYPE html><html><body style="margin:0;">${adHtml}</body></html>`, {
    headers: { "Content-Type": "text/html" },
  });
}
