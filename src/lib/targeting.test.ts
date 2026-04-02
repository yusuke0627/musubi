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
});
