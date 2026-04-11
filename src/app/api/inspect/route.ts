import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { parseUserAgentContext } from "@/lib/userAgent";
import { checkTargeting } from "@/lib/targeting";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adUnitIdParam = searchParams.get("ad_unit_id");
  const uaOverride = searchParams.get("ua");
  
  if (!adUnitIdParam) {
    return NextResponse.json({ error: "ad_unit_id is required" }, { status: 400 });
  }

  const adUnitId = parseInt(adUnitIdParam, 10);
  const ua = uaOverride || req.headers.get("user-agent") || "";

  // 1. 基本情報の取得
  const adUnit = await prisma.adUnit.findUnique({
    where: { id: adUnitId },
    include: { app: { include: { publisher: true } } }
  });

  if (!adUnit) {
    return NextResponse.json({ error: "Ad Unit not found" }, { status: 404 });
  }

  const publisherId = adUnit.app.publisher_id;
  const publisherCategory = adUnit.app.publisher.category;
  const { os, device } = parseUserAgentContext(ua);
  const currentDevice = device.toLowerCase();

  const now = new Date();
  const dayOfWeekParam = searchParams.get("day_of_week");
  const hourParam = searchParams.get("hour");
  const dayOfWeek = dayOfWeekParam !== null ? parseInt(dayOfWeekParam, 10) : now.getDay();
  const hour = hourParam !== null ? parseInt(hourParam, 10) : now.getHours();
  const isEmulated = dayOfWeekParam !== null || hourParam !== null;

  // 2. 全広告候補の取得 (ステータス無視で全部取る)
  const allAds = await prisma.ad.findMany({
    include: {
      adGroup: {
        include: {
          campaign: {
            include: {
              advertiser: true
            }
          },
          targetPublishers: true,
          schedules: true
        }
      },
      _count: {
        select: {
          impressions: true,
          clicks: { where: { is_valid: 1 } }
        }
      }
    }
  });

  // 3. オークション・シミュレーション
  const results = allAds.map((ad) => {
    const group = ad.adGroup;
    const campaign = group.campaign;
    const advertiser = campaign.advertiser;

    const imps = ad._count.impressions;
    const clicks = ad._count.clicks;
    const score = group.max_bid * ((clicks + 1) / (imps + 100));

    let status = "QUALIFIED";
    let reason = "";

    // ステップ1: 広告ステータス
    if (ad.review_status !== 'approved') {
      status = "REJECTED";
      reason = `AD_STATUS_${ad.review_status.toUpperCase()}`;
    }
    // ステップ2: 広告主残高
    else if (advertiser.balance < group.max_bid) {
      status = "REJECTED";
      reason = "INSUFFICIENT_ADVERTISER_BALANCE";
    }
    // ステップ3: カテゴリマッチング
    else if (group.target_category && group.target_category !== '' && group.target_category !== publisherCategory) {
      status = "REJECTED";
      reason = `CATEGORY_MISMATCH (Target: ${group.target_category}, Pub: ${publisherCategory})`;
    }
    // ステップ4: 合計予算
    else if (campaign.budget > 0 && campaign.spent >= campaign.budget) {
      status = "REJECTED";
      reason = "TOTAL_BUDGET_EXCEEDED";
    }
    // ステップ5: 日次予算
    else if (campaign.daily_budget > 0 && campaign.today_spent >= campaign.daily_budget) {
      status = "REJECTED";
      reason = "DAILY_BUDGET_EXCEEDED";
    }
    // ステップ6: デバイス判定
    else if (group.target_device !== 'all' && group.target_device !== currentDevice) {
      status = "REJECTED";
      reason = `DEVICE_MISMATCH (Target: ${group.target_device}, Req: ${currentDevice})`;
    }
    // ステップ7: 配信先チェック
    else if (group.is_all_publishers === 0 && !group.targetPublishers.some(tp => tp.publisher_id === publisherId)) {
      status = "REJECTED";
      reason = "PUBLISHER_NOT_TARGETED";
    }
    // ステップ8: 期間チェック
    else if ((campaign.start_date && campaign.start_date > now) || (campaign.end_date && campaign.end_date < now)) {
      status = "REJECTED";
      reason = "CAMPAIGN_OUT_OF_DATE_RANGE";
    }
    // ステップ9: スケジュールチェック (ad_schedulesテーブル)
    else if (group.schedules.length > 0 && !group.schedules.some(s => s.day_of_week === dayOfWeek && s.start_hour <= hour && s.end_hour >= hour)) {
      status = "REJECTED";
      reason = "OUT_OF_SCHEDULE";
    }
    // ステップ10: OS・Scheduleターゲティング (targeting JSON)
    else if (group.targeting && !checkTargeting(group.targeting, { os, dayOfWeek, hour, languages: [] })) {
      status = "REJECTED";
      // 理由を詳細化するため個別チェック
      try {
        const rules = JSON.parse(group.targeting);
        if (rules.os && Array.isArray(rules.os) && rules.os.length > 0 && !rules.os.includes(os)) {
          reason = `OS_MISMATCH (Target: ${rules.os.join(',')}, Req: ${os})`;
        } else if (rules.schedule) {
          reason = "SCHEDULE_MISMATCH";
        } else {
          reason = "TARGETING_MISMATCH";
        }
      } catch {
        reason = "INVALID_TARGETING_JSON";
      }
    }

    return {
      ad_id: ad.id,
      title: ad.title,
      ad_group: group.name,
      status,
      reason,
      score,
      max_bid: group.max_bid,
      stats: { imps, clicks, ctr: imps > 0 ? clicks / imps : 0 }
    };
  });

  // 4. 勝者の決定
  const qualifiedAds = results.filter(r => r.status === "QUALIFIED").sort((a, b) => b.score - a.score);
  const winner = qualifiedAds[0];

  const finalResults = results.map(r => {
    if (r.status === "QUALIFIED") {
      if (winner && r.ad_id === winner.ad_id) {
        return { ...r, status: "WINNER" };
      } else {
        return { ...r, status: "REJECTED", reason: "OUTBID" };
      }
    }
    return r;
  });

  return NextResponse.json({
    context: {
      ad_unit_id: adUnitId,
      publisher: adUnit.app.publisher.name,
      category: publisherCategory,
      os,
      device: currentDevice,
      timestamp: now.toISOString(),
      emulated: isEmulated,
      day_of_week: dayOfWeek,
      hour,
    },
    auction: {
      total_ads: allAds.length,
      qualified_ads: qualifiedAds.length,
      winner: winner ? { id: winner.ad_id, title: winner.title, score: winner.score } : null,
      results: finalResults.sort((a, b) => {
        // Status priority: WINNER > QUALIFIED(REJECTED by OUTBID) > REJECTED
        const statusOrder: Record<string, number> = { "WINNER": 0, "REJECTED": 1 };
        if (a.status !== b.status) return statusOrder[a.status] - statusOrder[b.status];
        return b.score - a.score;
      })
    }
  });
}
