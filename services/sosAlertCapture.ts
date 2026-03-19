import * as Location from "expo-location";

export type SosAlert = {
  latitude: number;
  longitude: number;
  town: string;
  type: string;
  /** ISO-8601 datetime string */
  time: string;
};

export async function detectTownFromCoords(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = results?.[0];
    if (!first) return null;

    // Try a few common fields depending on platform/provider.
    return (
      first.city ||
      (first as any).town ||
      (first as any).district ||
      first.subregion ||
      first.region ||
      first.name ||
      null
    );
  } catch {
    return null;
  }
}

export async function captureSosAlertFromGps(
  type: string,
  now: Date = new Date(),
): Promise<SosAlert> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const latitude = pos.coords.latitude;
  const longitude = pos.coords.longitude;
  const town = (await detectTownFromCoords(latitude, longitude)) || "Unknown";

  return {
    latitude,
    longitude,
    town,
    type,
    time: now.toISOString(),
  };
}

/**
 * Stub for DB persistence.
 *
 * Wire this to Supabase later (insert into your `sos_alerts` table).
 */
export async function saveSosAlertToDatabase(_alert: SosAlert): Promise<void> {
  // Intentionally a no-op for now.
}
