import { describe, it, expect, vi } from "vitest";
import { authConfig } from "./auth.config";

describe("authConfig.callbacks.authorized", () => {
  const authorized = authConfig.callbacks.authorized as any;

  it("should return false for protected routes when not logged in", () => {
    const routes = ["/admin", "/advertiser/1", "/publisher/1"];
    routes.forEach((path) => {
      const result = authorized({
        auth: null,
        request: { nextUrl: new URL(path, "http://localhost") },
      });
      expect(result).toBe(false);
    });
  });

  it("should return true for public routes when not logged in", () => {
    const result = authorized({
      auth: null,
      request: { nextUrl: new URL("/", "http://localhost") },
    });
    expect(result).toBe(true);
  });

  it("should allow admin to access all protected routes", () => {
    const auth = { user: { role: "admin" } };
    const routes = ["/admin", "/advertiser/1", "/publisher/1"];
    routes.forEach((path) => {
      const result = authorized({
        auth,
        request: { nextUrl: new URL(path, "http://localhost") },
      });
      expect(result).toBe(true);
    });
  });

  it("should deny non-admin users from accessing /admin", () => {
    const auth = { user: { role: "advertiser" } };
    const result = authorized({
      auth,
      request: { nextUrl: new URL("/admin", "http://localhost") },
    });
    
    expect(result).toBeInstanceOf(Response);
    expect(result.headers.get("Location")).toContain("/403");
  });

  it("should allow advertiser to access advertiser routes", () => {
    const auth = { user: { role: "advertiser" } };
    const result = authorized({
      auth,
      request: { nextUrl: new URL("/advertiser/1", "http://localhost") },
    });
    expect(result).toBe(true);
  });

  it("should allow publisher to access publisher routes", () => {
    const auth = { user: { role: "publisher" } };
    const result = authorized({
      auth,
      request: { nextUrl: new URL("/publisher/1", "http://localhost") },
    });
    expect(result).toBe(true);
  });
});
