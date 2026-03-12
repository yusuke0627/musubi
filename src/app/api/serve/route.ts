import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publisherId = searchParams.get("publisher_id");
  
  if (!publisherId) {
    return new NextResponse("publisher_id is required", { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  
  // 簡易デバイス判定
  const isMobile = /Mobi|Android/i.test(ua);
  const currentDevice = isMobile ? 'mobile' : 'desktop';

  // 現在の時刻、曜日、時間を取得 (JST想定だがシステム時刻に依存)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  // RTB版：期待収益（eCPM）に基づき、最も収益性が高い承認済み広告を1件取得
  const ad = db.prepare(`
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
        AND (ad_groups.target_device = 'all' OR ad_groups.target_device = ?)
        -- 配信先チェック (all または カンマ区切りのリストに publisherId が含まれるか)
        AND (
          ad_groups.target_publisher_ids = 'all' 
          OR ad_groups.target_publisher_ids = ?
          OR ',' || ad_groups.target_publisher_ids || ',' LIKE '%,' || ? || ',%'
        )
        -- 期間チェック (SQLiteの datetime('now') を使用)
        AND (campaigns.start_date IS NULL OR campaigns.start_date <= datetime('now'))
        AND (campaigns.end_date IS NULL OR campaigns.end_date >= datetime('now'))
        -- スケジュールチェック
        AND (
          NOT EXISTS (SELECT 1 FROM ad_schedules WHERE ad_group_id = ad_groups.id)
          OR EXISTS (
            SELECT 1 FROM ad_schedules 
            WHERE ad_group_id = ad_groups.id 
              AND day_of_week = ? 
              AND start_hour <= ? 
              AND end_hour >= ?
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
  `).get(currentDevice, publisherId, publisherId, dayOfWeek, hour, hour) as any;

  if (!ad) {
    return new NextResponse(null, { status: 204 });
  }

  // インプレッションを記録
  db.prepare('INSERT INTO impressions (ad_id, publisher_id, user_agent, ip_address) VALUES (?, ?, ?, ?)')
    .run(ad.id, publisherId, ua, ip);

  // シンプルなHTML断片を返す
  const clickUrl = `${new URL(req.url).origin}/api/click?ad_id=${ad.id}&publisher_id=${publisherId}`;
  
  const html = `
    <a href="${clickUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block;">
      <div style="border: 1px solid #ccc; padding: 10px; text-align: center; font-family: sans-serif; max-width: 300px; cursor: pointer; background: white;">
        <h4 style="margin: 0 0 5px 0; color: #333;">${ad.title}</h4>
        <p style="font-size: 12px; color: #666; margin: 0 0 10px 0;">${ad.description}</p>
        <img src="${ad.image_url}" style="width: 100%; border-radius: 4px; background: #eee; min-height: 100px; object-fit: cover;" alt="Ad Image" />
        <div style="font-size: 10px; color: #999; margin-top: 5px;">Sponsored by AdNetwork</div>
      </div>
    </a>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
