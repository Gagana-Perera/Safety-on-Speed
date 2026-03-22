import {
  isValidGuardianPhone,
  normalizeGuardianPhone,
  sanitizeGuardianPhoneInput,
} from "@/lib/guardianPhone";

describe("guardian phone helpers", () => {
  it("normalizes older plus-prefixed and local Sri Lankan numbers to 94 format", () => {
    expect(normalizeGuardianPhone("+94 77 123 4567")).toBe("94771234567");
    expect(normalizeGuardianPhone("0771234567")).toBe("94771234567");
    expect(normalizeGuardianPhone("771234567")).toBe("94771234567");
  });

  it("sanitizes phone input to the canonical 94-prefixed format", () => {
    expect(sanitizeGuardianPhoneInput("+94771234567")).toBe("94771234567");
    expect(sanitizeGuardianPhoneInput("07 712 34567")).toBe("94771234567");
  });

  it("validates only full 947xxxxxxxx mobile numbers", () => {
    expect(isValidGuardianPhone("94771234567")).toBe(true);
    expect(isValidGuardianPhone("+94771234567")).toBe(true);
    expect(isValidGuardianPhone("9477123456")).toBe(false);
    expect(isValidGuardianPhone("94112345678")).toBe(false);
  });
});
