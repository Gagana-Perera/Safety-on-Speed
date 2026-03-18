import {
  buildSOSAlertMessage,
  extractGuardianRecipients,
} from "@/hooks/notifyVerifiedGuardians";

describe("guardian alert helpers", () => {
  it("prefers verified guardians when they exist", () => {
    const recipients = extractGuardianRecipients({
      g1_name: "Primary",
      g1_phone: "+94 712345678",
      g1_verified: true,
      g2_name: "Backup",
      g2_phone: "+94 771234567",
      g2_verified: false,
      g3_name: null,
      g3_phone: null,
      g3_verified: null,
      g4_name: null,
      g4_phone: null,
      g4_verified: null,
      g5_name: null,
      g5_phone: null,
      g5_verified: null,
    });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].name).toBe("Primary");
  });

  it("builds an emergency SOS message with the link and sender name", () => {
    const message = buildSOSAlertMessage({
      liveLocationLink: "https://example.com/sos/token",
      mode: "emergency",
      senderName: "Alex",
      startedAt: "2026-03-18T18:00:00.000Z",
    });

    expect(message).toContain("EMERGENCY SOS");
    expect(message).toContain("Alex");
    expect(message).toContain("https://example.com/sos/token");
    expect(message).toContain("Please respond immediately.");
  });
});
