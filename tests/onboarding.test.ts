import { describe, expect, it } from "vitest";
import { formatMobile, isValidEmail, isValidMobile, isValidPassword } from "@/lib/onboarding/validate";

describe("onboarding validation", () => {
  it("masks mobiles as 04XX XXX XXX", () => {
    expect(formatMobile("0412345678")).toBe("0412 345 678");
    expect(formatMobile("0412 34")).toBe("0412 34");
    expect(formatMobile("+61 412 345 678")).toBe("0412 345 678");
    expect(formatMobile("04123456789999")).toBe("0412 345 678");
  });
  it("needs 10 digits starting with 04", () => {
    expect(isValidMobile("0412 345 678")).toBe(true);
    expect(isValidMobile("+61412345678")).toBe(true);
    expect(isValidMobile("0312 345 678")).toBe(false);
    expect(isValidMobile("0412 345 67")).toBe(false);
  });
  it("checks email shape and password length", () => {
    expect(isValidEmail("jess.taylor@example.com")).toBe(true);
    expect(isValidEmail("jess@")).toBe(false);
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("long enough!")).toBe(true);
  });
});
