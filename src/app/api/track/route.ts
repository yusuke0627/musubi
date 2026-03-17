import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { click_id, url } = await req.json();

    if (!click_id || !url) {
      return NextResponse.json({ error: "Missing click_id or url" }, { status: 400 });
    }

    // 1. Clickデータから広告主を特定する
    const click = await prisma.click.findUnique({
      where: { click_id },
      include: {
        ad: {
          include: {
            adGroup: {
              include: {
                campaign: {
                  include: {
                    advertiser: {
                      include: {
                        conversionRules: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!click) {
      return NextResponse.json({ error: "Invalid click_id" }, { status: 404 });
    }

    const advertiser = click.ad.adGroup.campaign.advertiser;
    const rules = advertiser.conversionRules;

    // 2. 現在のURLが広告主のどのルールに一致するかチェックする
    // (ここでは簡易的に includes でチェックするけど、将来的に正規表現とかも対応できるね！)
    const matchedRules = rules.filter(rule => url.includes(rule.url_pattern));

    if (matchedRules.length === 0) {
      return NextResponse.json({ status: "tracked", matched: 0 });
    }

    // 3. 一致したルールをすべてコンバージョンとして記録する
    const conversions = await Promise.all(
      matchedRules.map(async (rule) => {
        // 同じclick_idで同じルールが既に記録されていないかチェック (重複防止)
        const existing = await prisma.conversion.findFirst({
          where: { click_id, rule_id: rule.id }
        });

        if (existing) return null;

        return prisma.conversion.create({
          data: {
            click_id: click_id,
            rule_id: rule.id,
            revenue: rule.revenue
          }
        });
      })
    );

    const createdCount = conversions.filter(c => c !== null).length;

    return NextResponse.json({ 
      status: "success", 
      matched: matchedRules.length,
      conversions: createdCount 
    });

  } catch (error) {
    console.error("Tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
