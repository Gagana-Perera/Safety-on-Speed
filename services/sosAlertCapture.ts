import * as Location from "expo-location";
import { supabase } from "@/lib/superbase";
import {
  aggregateSosAlertsByTown,
  type SosTownAggregate,
} from "./sosHeatmap";
import type { ReportHeatmapPoint } from "./sosHeatmap";

export type SosAlert = {
  latitude: number;
  longitude: number;
  town: string;
  type: string;
  /** ISO-8601 datetime string */
  time: string;
};

export type ReportRowForHeatmap = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  lon?: number | string | null;
  /** Optional ISO-8601 datetime string from reports.created_at. */
  created_at?: string | null;
  time?: string | null;
  [key: string]: unknown;
};

const REVERSE_GEOCODING_API_URL =
  process.env.EXPO_PUBLIC_REVERSE_GEOCODING_API_URL?.trim() || "";
const REVERSE_GEOCODING_API_KEY =
  process.env.EXPO_PUBLIC_REVERSE_GEOCODING_API_KEY?.trim() || "";

const isValidCoordinate = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const coordCacheKey = (lat: number, lng: number) =>
  `${lat.toFixed(3)}:${lng.toFixed(3)}`;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const cleanTown = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text ? text : null;
};

const pickTownFromAddressComponents = (components: any[]): string | null => {
  for (const c of components) {
    if (!c || typeof c !== "object") continue;
    const types = Array.isArray(c.types) ? c.types : [];
    const longName = cleanTown(c.long_name ?? c.longName ?? c.name);
    if (!longName) continue;
    if (
      types.includes("locality") ||
      types.includes("postal_town") ||
      types.includes("administrative_area_level_2") ||
      types.includes("sublocality")
    ) {
      return longName;
    }
  }
  return null;
};

const pickTownFromObject = (obj: any): string | null => {
  if (!obj || typeof obj !== "object") return null;

  const direct =
    cleanTown(obj.town) ||
    cleanTown(obj.city) ||
    cleanTown(obj.district) ||
    cleanTown(obj.subregion) ||
    cleanTown(obj.region) ||
    cleanTown(obj.name);
  if (direct) return direct;

  const addressObj = obj.address || obj.properties || obj.context;
  const nested = pickTownFromObject(addressObj);
  if (nested) return nested;

  const fromComponents = pickTownFromAddressComponents(obj.address_components);
  if (fromComponents) return fromComponents;

  const firstResult = Array.isArray(obj.results) ? obj.results[0] : null;
  const fromFirstResult = pickTownFromObject(firstResult);
  if (fromFirstResult) return fromFirstResult;

  const firstFeature = Array.isArray(obj.features) ? obj.features[0] : null;
  return pickTownFromObject(firstFeature);
};

const buildConfiguredReverseGeocodeUrl = (
  latitude: number,
  longitude: number,
): string | null => {
  if (!REVERSE_GEOCODING_API_URL) return null;

  if (
    REVERSE_GEOCODING_API_URL.includes("{lat}") ||
    REVERSE_GEOCODING_API_URL.includes("{lng}") ||
    REVERSE_GEOCODING_API_URL.includes("{lon}") ||
    REVERSE_GEOCODING_API_URL.includes("{key}")
  ) {
    return REVERSE_GEOCODING_API_URL.replace("{lat}", encodeURIComponent(String(latitude)))
      .replace("{lng}", encodeURIComponent(String(longitude)))
      .replace("{lon}", encodeURIComponent(String(longitude)))
      .replace("{key}", encodeURIComponent(REVERSE_GEOCODING_API_KEY));
  }

  try {
    const url = new URL(REVERSE_GEOCODING_API_URL);
    const params = url.searchParams;

    if (!params.has("lat") && !params.has("latitude")) {
      params.set("lat", String(latitude));
    }
    if (!params.has("lng") && !params.has("lon") && !params.has("longitude")) {
      params.set("lng", String(longitude));
    }
    if (
      REVERSE_GEOCODING_API_KEY &&
      !params.has("key") &&
      !params.has("api_key") &&
      !params.has("access_token")
    ) {
      params.set("key", REVERSE_GEOCODING_API_KEY);
    }

    return url.toString();
  } catch {
    return null;
  }
};

async function detectTownFromConfiguredApi(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = buildConfiguredReverseGeocodeUrl(latitude, longitude);
  if (!url) return null;

  try {
    const response = await fetch(url, {
      headers: REVERSE_GEOCODING_API_KEY
        ? {
            Authorization: `Bearer ${REVERSE_GEOCODING_API_KEY}`,
            "x-api-key": REVERSE_GEOCODING_API_KEY,
          }
        : undefined,
    });

    if (!response.ok) return null;

    const payload = await response.json();
    return pickTownFromObject(payload);
  } catch {
    return null;
  }
}

/**
 * Normalizes raw `reports` rows (lat/lng from Supabase) into valid heatmap points.
 */
export function extractHeatmapPointsFromReports(
  rows?: ReportRowForHeatmap[] | null,
): ReportHeatmapPoint[] {
  const input = Array.isArray(rows) ? rows : [];
  const points: ReportHeatmapPoint[] = [];

  for (const row of input) {
    const latitude = toFiniteNumber(row.latitude ?? row.lat);
    const longitude = toFiniteNumber(row.longitude ?? row.lng ?? row.lon);

    if (latitude === null || longitude === null) {
      continue;
    }
    if (!isValidCoordinate(latitude, longitude)) {
      continue;
    }

    const pointTime =
      typeof row.created_at === "string"
        ? row.created_at
        : typeof row.time === "string"
          ? row.time
          : undefined;

    points.push({
      latitude,
      longitude,
      time: pointTime,
    });
  }

  return points;
}

async function selectReportRowsWithColumns(
  columns: string,
  limit: number,
): Promise<{ data: ReportRowForHeatmap[]; error: any }> {
  const { data, error } = await supabase
    .from("reports")
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  console.log(data);
  console.log(error);

  const normalizedData = Array.isArray(data)
    ? (data as unknown as ReportRowForHeatmap[])
    : [];

  return {
    data: normalizedData,
    error,
  };
}

/**
 * Reads report rows for heatmap from Supabase.
 * Tries common coordinate column naming variants.
 */
export async function fetchReportRowsForHeatmap(
  limit: number = 1000,
): Promise<ReportRowForHeatmap[]> {
  const normalizedLimit = Math.max(1, Math.min(5000, Math.floor(limit)));

  const attempts = [
    "latitude, longitude, created_at",
    "lat, lng, created_at",
    "lat, lon, created_at",
  ];

  let lastError: any = null;

  for (const columns of attempts) {
    const { data, error } = await selectReportRowsWithColumns(
      columns,
      normalizedLimit,
    );
    if (!error) {
      return data;
    }
    lastError = error;
  }

  throw lastError ?? new Error("Failed to fetch reports for heatmap");
}

export async function detectTownFromCoords(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  // Preferred path for report-based heatmap usage:
  // set EXPO_PUBLIC_REVERSE_GEOCODING_API_URL (and optional ..._API_KEY).
  const fromConfiguredApi = await detectTownFromConfiguredApi(latitude, longitude);
  if (fromConfiguredApi) return fromConfiguredApi;

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
 * Converts reports rows (lat/lng only) into town-tagged alerts by reverse geocoding.
 * Use this when your heatmap source is the `reports` table in Supabase.
 */
export async function mapReportsToTownAlerts(
  rows?: ReportRowForHeatmap[] | null,
): Promise<SosAlert[]> {
  const points = extractHeatmapPointsFromReports(rows);
  const townCache = new Map<string, string>();
  const unknownTown = "Unknown";
  const alerts: SosAlert[] = [];

  for (const point of points) {
    const key = coordCacheKey(point.latitude, point.longitude);
    let town = townCache.get(key);

    if (!town) {
      town =
        (await detectTownFromCoords(point.latitude, point.longitude)) || unknownTown;
      townCache.set(key, town);
    }

    alerts.push({
      latitude: point.latitude,
      longitude: point.longitude,
      town,
      type: "report",
      time: point.time ?? "1970-01-01T00:00:00.000Z",
    });
  }

  return alerts;
}

/**
 * End-to-end helper for the new flow:
 * reports table (lat/lng) -> reverse geocoded town -> average coordinates per town.
 */
export async function loadTownAveragesFromReports(
  limit: number = 1000,
): Promise<SosTownAggregate[]> {
  const rows = await fetchReportRowsForHeatmap(limit);
  const alerts = await mapReportsToTownAlerts(rows);
  return aggregateSosAlertsByTown(alerts);
}

/**
 * Stub for DB persistence.
 *
 * Wire this to Supabase later (insert into your `sos_alerts` table).
 */
export async function saveSosAlertToDatabase(_alert: SosAlert): Promise<void> {
  // Intentionally a no-op for now.
}
