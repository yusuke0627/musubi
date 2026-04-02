export interface TargetingContext {
  os: string;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  hour: number; // 0 - 23
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
