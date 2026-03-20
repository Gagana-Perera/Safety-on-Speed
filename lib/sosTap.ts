export const QUICK_SOS_CONFIRM_DELAY_MS = 400;
export const EMERGENCY_SOS_TAP_WINDOW_MS = 1200;

export type SOSTapOutcome = "emergency" | "quick" | null;

export function resolveSOSTapOutcome(
  tapTimestamps: number[],
  {
    emergencyWindowMs = EMERGENCY_SOS_TAP_WINDOW_MS,
  }: {
    emergencyWindowMs?: number;
  } = {},
): SOSTapOutcome {
  if (tapTimestamps.length >= 3) {
    const ordered = [...tapTimestamps].sort((a, b) => a - b);
    if (ordered[2] - ordered[0] <= emergencyWindowMs) {
      return "emergency";
    }
  }

  if (tapTimestamps.length === 1) {
    return "quick";
  }

  return null;
}

export function getEmergencyTapHint(tapCount: number) {
  if (tapCount <= 0) return "1 tap = Quick SOS";
  if (tapCount === 1) return "Tap 2 more times for Emergency SOS";
  if (tapCount === 2) return "Tap once more for Emergency SOS";
  return "Emergency SOS ready";
}
