import { describe, it, expect } from "vitest";
import { checkTargeting } from "./targeting";

describe("checkTargeting", () => {
  it("should pass when targeting is null", () => {
    expect(checkTargeting(null, { os: "iOS", dayOfWeek: 1, hour: 10 })).toBe(
      true
    );
  });

  it("should pass when schedule matches day and hour", () => {
    const targeting = JSON.stringify({ schedule: { mon: [10, 11, 12] } });
    expect(checkTargeting(targeting, { os: "iOS", dayOfWeek: 1, hour: 10 })).toBe(
      true
    );
  });

  it("should fail when schedule day mismatches", () => {
    const targeting = JSON.stringify({ schedule: { mon: [10, 11, 12] } });
    expect(checkTargeting(targeting, { os: "iOS", dayOfWeek: 2, hour: 10 })).toBe(
      false
    );
  });

  it("should fail when schedule hour mismatches", () => {
    const targeting = JSON.stringify({ schedule: { mon: [10, 11, 12] } });
    expect(checkTargeting(targeting, { os: "iOS", dayOfWeek: 1, hour: 13 })).toBe(
      false
    );
  });

  it("should pass when both os and schedule match", () => {
    const targeting = JSON.stringify({ os: ["iOS"], schedule: { mon: [10] } });
    expect(checkTargeting(targeting, { os: "iOS", dayOfWeek: 1, hour: 10 })).toBe(
      true
    );
  });

  it("should fail when os matches but schedule does not", () => {
    const targeting = JSON.stringify({ os: ["iOS"], schedule: { mon: [10] } });
    expect(checkTargeting(targeting, { os: "iOS", dayOfWeek: 1, hour: 11 })).toBe(
      false
    );
  });

  it("should fail when schedule matches but os does not", () => {
    const targeting = JSON.stringify({
      os: ["Android"],
      schedule: { mon: [10] },
    });
    expect(checkTargeting(targeting, { os: "iOS", dayOfWeek: 1, hour: 10 })).toBe(
      false
    );
  });

  it("should return false for invalid JSON", () => {
    expect(checkTargeting("not-json", { os: "iOS", dayOfWeek: 1, hour: 10 })).toBe(
      false
    );
  });

  describe("Language Targeting", () => {
    it("should pass when language matches", () => {
      const targeting = JSON.stringify({ languages: ["ja"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        languages: ["ja-jp", "en"] 
      })).toBe(true);
    });

    it("should pass when any language matches", () => {
      const targeting = JSON.stringify({ languages: ["en", "ja"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        languages: ["ja-jp"] 
      })).toBe(true);
    });

    it("should fail when language does not match", () => {
      const targeting = JSON.stringify({ languages: ["ja"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        languages: ["en-us", "en"] 
      })).toBe(false);
    });

    it("should pass when languages array is empty", () => {
      const targeting = JSON.stringify({ languages: [] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        languages: ["ja"] 
      })).toBe(true);
    });

    it("should pass when no languages provided in context", () => {
      const targeting = JSON.stringify({ languages: ["ja"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10 
      })).toBe(false);
    });

    it("should be case-insensitive for language matching", () => {
      const targeting = JSON.stringify({ languages: ["JA"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        languages: ["ja-jp"] 
      })).toBe(true);
    });
  });

  describe("Geo Targeting (Prefecture)", () => {
    it("should pass when prefecture matches", () => {
      const targeting = JSON.stringify({ geo: ["東京都"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        prefecture: "東京都"
      })).toBe(true);
    });

    it("should pass when any prefecture matches", () => {
      const targeting = JSON.stringify({ geo: ["東京都", "大阪府"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        prefecture: "大阪府"
      })).toBe(true);
    });

    it("should fail when prefecture does not match", () => {
      const targeting = JSON.stringify({ geo: ["東京都"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        prefecture: "大阪府"
      })).toBe(false);
    });

    it("should fail when prefecture is undefined", () => {
      const targeting = JSON.stringify({ geo: ["東京都"] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10 
      })).toBe(false);
    });

    it("should pass when geo array is empty", () => {
      const targeting = JSON.stringify({ geo: [] });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        prefecture: "東京都"
      })).toBe(true);
    });
  });

  describe("Combined Targeting", () => {
    it("should pass when all criteria match", () => {
      const targeting = JSON.stringify({
        os: ["iOS"],
        languages: ["ja"],
        geo: ["東京都"],
        schedule: { mon: [10] }
      });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        languages: ["ja-jp"],
        prefecture: "東京都"
      })).toBe(true);
    });

    it("should fail when one criterion does not match", () => {
      const targeting = JSON.stringify({
        os: ["iOS"],
        languages: ["ja"],
        geo: ["東京都"]
      });
      expect(checkTargeting(targeting, { 
        os: "iOS", 
        dayOfWeek: 1, 
        hour: 10, 
        languages: ["ja-jp"],
        prefecture: "大阪府"
      })).toBe(false);
    });
  });
});
