import {
  EMERGENCY_SOS_TAP_WINDOW_MS,
  getEmergencyTapHint,
  resolveSOSTapOutcome,
} from "@/lib/sosTap";

describe("SOS tap recognition", () => {
  it("resolves a single tap as quick SOS", () => {
    expect(resolveSOSTapOutcome([1000])).toBe("quick");
  });

  it("resolves three taps inside the emergency window as emergency SOS", () => {
    expect(
      resolveSOSTapOutcome([
        1000,
        1000 + EMERGENCY_SOS_TAP_WINDOW_MS / 3,
        1000 + EMERGENCY_SOS_TAP_WINDOW_MS / 2,
      ]),
    ).toBe("emergency");
  });

  it("does not resolve a double tap as an SOS mode", () => {
    expect(resolveSOSTapOutcome([1000, 1200])).toBeNull();
  });

  it("returns the correct hint text while building toward emergency SOS", () => {
    expect(getEmergencyTapHint(1)).toContain("2 more");
    expect(getEmergencyTapHint(2)).toContain("once more");
  });
});
