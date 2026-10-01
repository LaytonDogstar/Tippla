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
});
