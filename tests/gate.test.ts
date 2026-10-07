import { describe, expect, it } from "vitest";
import { gateToken, safeNext, sameToken } from "@/lib/gate";

describe("preview password gate", () => {
  it("stores a hash, never the password", async () => {
    const t = await gateToken("secret");
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(t).not.toContain("secret");
    expect(sameToken(t, await gateToken("secret"))).toBe(true);
    expect(sameToken(t, await gateToken("Secret"))).toBe(false);
  });
  it("only redirects to same-site paths after signing in", () => {
    expect(safeNext("/spending?persona=jess")).toBe("/spending?persona=jess");
    for (const bad of ["//evil.example", "https://evil.example", "/\\evil", "", null, undefined]) expect(safeNext(bad as string)).toBe("/");
  });

  it("redirects by path, never to the server's internal address (Railway's localhost:8080)", async () => {
    const { POST, GET } = await import("@/app/api/gate/route");
    const { NextRequest } = await import("next/server");
    const post = (password: string) => {
      const body = new URLSearchParams({ password, next: "/spending" });
      return POST(new NextRequest("http://localhost:8080/api/gate", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-proto": "https" } }));
    };
    const prev = process.env.SITE_PASSWORD;
    process.env.SITE_PASSWORD = "secret";
    try {
      const ok = await post("secret");
      expect(ok.status).toBe(303);
      expect(ok.headers.get("location")).toBe("/spending");
      expect(ok.headers.get("set-cookie")).toMatch(/tippla-gate|gate/i);
      const wrong = await post("nope");
      expect(wrong.headers.get("location")).toBe("/gate?error=1&next=%2Fspending");
      const out = await GET(new NextRequest("http://localhost:8080/api/gate?signout=1"));
      expect(out.headers.get("location")).toBe("/gate");
    } finally {
      if (prev === undefined) delete process.env.SITE_PASSWORD; else process.env.SITE_PASSWORD = prev;
    }
  });
});
