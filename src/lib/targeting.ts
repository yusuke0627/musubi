import type { Prefecture } from "./ipGeo";

export interface TargetingContext {
  os: string;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  hour: number; // 0 - 23
  languages?: string[]; // e.g., ["ja", "en"]
  prefecture?: Prefecture; // 都道府県
}

const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function checkTargeting(
  targeting: string | null,
  context: TargetingContext
): boolean {
  if (!targeting) return true;

  try {
    const rules = JSON.parse(targeting) as Record<string, unknown>;

    // OSターゲティングの判定
    if (Array.isArray(rules.os) && rules.os.length > 0) {
      if (!rules.os.includes(context.os)) {
        return false;
      }
    }

    // Languageターゲティングの判定
    if (Array.isArray(rules.languages) && rules.languages.length > 0) {
      // ユーザーの言語のいずれかがターゲット言語に含まれるか
      const userLanguages = context.languages || [];
      const hasMatchingLang = userLanguages.some((lang) =>
        (rules.languages as string[]).some((targetLang: string) =>
          lang.toLowerCase().startsWith(targetLang.toLowerCase())
        )
      );
      if (!hasMatchingLang) {
        return false;
      }
    }

    // Geoターゲティング（都道府県）の判定
    if (Array.isArray(rules.geo) && rules.geo.length > 0) {
      if (!context.prefecture || !rules.geo.includes(context.prefecture)) {
        return false;
      }
    }

    // スケジュールターゲティングの判定
    if (
      rules.schedule &&
      typeof rules.schedule === "object" &&
      !Array.isArray(rules.schedule)
    ) {
      const dayKey = DAY_MAP[context.dayOfWeek];
      const hours = (rules.schedule as Record<string, unknown>)[dayKey];
      if (Array.isArray(hours) && hours.length > 0) {
        if (!hours.includes(context.hour)) {
          return false;
        }
      } else {
        // schedule が設定されているが、その曜日に配信時間がない場合は除外
        return false;
      }
    }
  } catch (e) {
    console.error("Failed to parse targeting JSON", e);
    return false;
  }

  return true;
}
