/**
 * Google Places integration layer.
 *
 * This module is intentionally the only place that knows how to talk to the
 * Google Places HTTP APIs. Screens call these helpers instead of building URLs
 * directly.
 *
 * Why this exists:
 * - Keeps UI code focused on UX/state, not network plumbing.
 * - Centralizes heuristics (e.g., "avoid specialty-only hospitals") so behavior
 *   is consistent across Emergency Services + Map.
 * - Makes it easy to mock `fetch()` in Jest tests.
 *
 * Endpoints used:
 * - Nearby Search: `nearbysearch/json`
 * - Place Details: `details/json`
 * - Photo: `photo`
 */
import Constants from "expo-constants";

const GOOGLE_API_KEY: string =
  process.env.EXPO_PUBLIC_GOOGLE_API_KEY ||
  String(Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY ?? "");

// `EXPO_PUBLIC_*` variables are safe to read in the app bundle in Expo.
// In local/dev you typically set this in `.env` or `app.config.js`.

/**
 * Google Places helpers used across the app.
 *
 * Notes:
 * - We centralize URL building / response parsing here to keep screens simple.
 * - This file mixes a few endpoints:
 *   - Places Nearby Search (nearbysearch/json)
 *   - Places Details (details/json)
 *   - Places Photo (photo)
 */

export type PlaceSuggestion = {
  placeId: string;
  description: string;
};

export type PlaceCoordinates = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
};

// The exported types below are intentionally “screen-friendly”:
// - They match what our UI cards and markers need.
// - They avoid leaking raw Google response shapes into the rest of the app.

/**
 * Heuristic: Identify specialty-only facilities that are often *not* a good
 * default for the Emergency Services "hospital" action (e.g., eye/dental).
 *
 * This is not used to block results entirely; it is used to *prefer* general
 * hospitals when available.
 */
function isLikelySpecialtyHospitalName(name: string): boolean {
  // Emergency UX expects an emergency-capable general hospital.
  // Places can return specialty facilities (e.g., eye hospitals) for `type=hospital`.
  // We treat these as lower-priority matches, but we still allow them as a fallback
  // if there are no other candidates nearby.
  const n = String(name ?? "").toLowerCase();
  if (!n.trim()) return false;

  // Common specialty signals. Keep this list narrow and obvious to avoid false positives.
  return (
    /\b(eye|ophthalm|optical|vision|lasik)\b/i.test(n) ||
    /\b(dental|dentist)\b/i.test(n)
  );
}

/**
 * Heuristic: Detect whether a hospital name suggests ER/A&E capability.
 *
 * Used to prefer emergency-capable facilities for non-emergency hospital
 * searches (where the user still expects an ER-capable option).
 */
function isEmergencyLikeHospitalName(name: string): boolean {
  // Detect common “ER/A&E/Emergency” signals in a place name.
  // This is a heuristic to prefer emergency-capable facilities when available.
  const n = String(name ?? "").toLowerCase();
  if (!n.trim()) return false;
  return (
    /\bemergency\b/i.test(n) ||
    /\bemergency\s+(department|room|unit)\b/i.test(n) ||
    /\b(\ber\b|a\&e|a\s*\/\s*e|accident\s+and\s+emergency)\b/i.test(n)
  );
}

/**
 * Heuristic: For Places `type=police`, ensure we only accept actual police
 * stations and not nearby venues that happen to be tagged with the police type.
 */
function isExactPoliceStationName(name: string): boolean {
  const n = String(name ?? "").trim();
  if (!n) return false;

  // Must contain the exact phrase.
  if (!/\bpolice\s+station\b/i.test(n)) return false;

  // Exclude common non-station results that still get tagged as `police`.
  if (/\bpolice\s+post\b/i.test(n)) return false;
  if (
    /\bpolice\s+station\b[^\n]*\b(basketball|ground|grounds|playground|court|stadium|field|park)\b/i.test(
      n,
    )
  ) {
    return false;
  }

  return true;
}

export type PlaceDetails = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  reviews?: PlaceReview[];
  types?: string[];
  phoneNumber?: string;
  website?: string;
  googleMapsUrl?: string;
  isOpenNow?: boolean;
  nextOpenTimeText?: string;
  wheelchairAccessibleEntrance?: boolean;
  priceLevel?: number;
  photos?: PlacePhoto[];
};

export type PlaceReview = {
  rating?: number;
};

export type PlacePhoto = {
  photoReference: string;
  width?: number;
  height?: number;
};

export type NearbyPlace = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
  types?: string[];
  isOpenNow?: boolean;
  nextOpenTimeText?: string;
  wheelchairAccessibleEntrance?: boolean;
};

/**
 * Places returns times as `HHMM` strings (e.g. "0930"). This parser validates the
 * format and returns minutes from midnight.
 */
const parseHhmmToMinutes = (hhmm: unknown): number | null => {
  if (typeof hhmm !== "string") return null;
  if (!/^\d{4}$/.test(hhmm)) return null;
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(2, 4));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

/**
 * Converts minutes from midnight to a human-friendly 12h clock string.
 * Example: `0 -> "12:00 AM"`, `13*60+5 -> "1:05 PM"`.
 */
const formatMinutesTo12Hour = (minutes: number): string => {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
};

/**
 * Computes a friendly "opens at" label when a place is currently closed.
 *
 * Inputs are raw Places Details fields (`opening_hours` / `current_opening_hours`)
 * and `utc_offset_minutes`. We keep the implementation defensive because these
 * fields can be absent or shaped differently depending on the place.
 */
const computeNextOpenTimeText = (
  result: any,
  isOpenNow: boolean | undefined,
): string | undefined => {
  if (isOpenNow !== false) return undefined;

  const utcOffsetMinutes =
    typeof result?.utc_offset_minutes === "number"
      ? result.utc_offset_minutes
      : typeof result?.utc_offset === "number"
        ? result.utc_offset
        : null;
  if (utcOffsetMinutes === null) return undefined;

  const periods =
    result?.current_opening_hours?.periods ?? result?.opening_hours?.periods;
  if (!Array.isArray(periods) || periods.length === 0) return undefined;

  // Compute "now" in the place's local time using utc_offset_minutes.
  // Places Details provides the offset for the place's timezone; we convert Date.now() into that local time.
  const nowLocal = new Date(Date.now() + utcOffsetMinutes * 60_000);
  // We intentionally read the shifted date via getUTC* so that the offset-adjusted
  // timestamp acts like a “local clock” independent of the device timezone.
  const nowDay = nowLocal.getUTCDay();
  const nowMinutes = nowLocal.getUTCHours() * 60 + nowLocal.getUTCMinutes();
  const nowWeekMinutes = nowDay * 1440 + nowMinutes;

  let bestOpenWeekMinutes: number | null = null;
  let bestOpenDay: number | null = null;
  let bestOpenMinutes: number | null = null;

  for (const p of periods) {
    const open = p?.open;
    const openDay = typeof open?.day === "number" ? open.day : null;
    const openMins = parseHhmmToMinutes(open?.time);
    if (openDay === null || openMins === null) continue;

    let openWeekMinutes = openDay * 1440 + openMins;
    if (openWeekMinutes <= nowWeekMinutes) openWeekMinutes += 7 * 1440;

    if (bestOpenWeekMinutes === null || openWeekMinutes < bestOpenWeekMinutes) {
      bestOpenWeekMinutes = openWeekMinutes;
      bestOpenDay = openDay;
      bestOpenMinutes = openMins;
    }
  }

  if (
    bestOpenWeekMinutes === null ||
    bestOpenDay === null ||
    bestOpenMinutes === null
  ) {
    return undefined;
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const timeText = formatMinutesTo12Hour(bestOpenMinutes);
  if (bestOpenDay === nowDay) return timeText;
  const dayText = dayNames[bestOpenDay] ?? "";
  return dayText ? `${dayText} ${timeText}` : timeText;
};

/**
 * Finds the closest place near a coordinate.
 * Useful when the map provider doesn't give a placeId on tap (e.g. iOS default provider).
 */

/*
  When a user taps on the map, you only know the coordinates—not the place itself.
  The Google Places API needs a search area to look for places near those coordinates.
  By setting a small radius (e.g., 40 meters), you limit the search to places very close to the tapped spot,
  increasing the chance that the result matches the exact location.
*/
/**
 * Reverse-lookup: coordinates -> nearest place.
 *
 * Used when a map tap only yields raw coordinates (no place id). We query a
 * small-radius Nearby Search and return the first match as the nearest place.
 *
 * Notes for viva:
 * - We keep the radius tiny (default 40m) because the user tapped a specific point.
 * - The return type is `NearbyPlace` (our minimal card/marker model), not raw Google JSON.
 * - On any API/network issue we return `null` so screens can safely ignore it.
 */
export async function findNearestPlaceAt(
  lat: number,
  lng: number,
  radiusMeters = 40,
): Promise<NearbyPlace | null> {
  // Uses a small-radius Nearby Search to map raw coordinates -> the nearest place.
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${encodeURIComponent(
    String(radiusMeters),
  )}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (
      data.status === "OK" &&
      Array.isArray(data.results) &&
      data.results[0]
    ) {
      const r = data.results[0];
      const loc = r?.geometry?.location;
      if (!loc || !r?.place_id) return null;
      return {
        placeId: r.place_id,
        name: r.name || "Selected place",
        latitude: loc.lat,
        longitude: loc.lng,
        vicinity: r.vicinity,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        types: Array.isArray(r.types) ? r.types : undefined,
        isOpenNow:
          typeof r.opening_hours?.open_now === "boolean"
            ? r.opening_hours.open_now
            : undefined,
        wheelchairAccessibleEntrance:
          typeof r.wheelchair_accessible_entrance === "boolean"
            ? r.wheelchair_accessible_entrance
            : undefined,
      } satisfies NearbyPlace;
    }

    if (data.error_message) {
      console.error("API Error Message:", data.error_message);
    }

    return null;
  } catch (error) {
    console.error("Network Error in findNearestPlaceAt:", error);
    return null;
  }
}

/**
 * Finds the unique Place ID for the *closest* matching service.
 *
 * This is primarily used by the Emergency Services tab, where we want one best
 * candidate to call or navigate to.
 *
 * Why it returns only `place_id` (not full details):
 * - Emergency Services flows only need to dial or navigate.
 * - Details are fetched separately only when we need richer UI.
 *
 * Strategy:
 * 1) Prefer `rankby=distance` with an explicit Places `type` (police/hospital/pharmacy)
 *    so the nearest candidates are in the result set.
 * 2) Run multiple keyword attempts when needed (especially for hospitals) and
 *    pick the nearest across all attempts (not "first non-empty").
 * 3) Fall back to radius-based queries if rank-by-distance gives no usable candidates.
 *
 * Important: This function contains product heuristics:
 * - Hospitals: prefer non-specialty facilities; optionally prefer emergency-like names.
 * - Police: only accept results that look like actual police stations.
 */
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  serviceType: string,
  options?: { includeSecondPage?: boolean },
): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    console.error("[Google Search] Missing EXPO_PUBLIC_GOOGLE_API_KEY");
    return null;
  }

  // Haversine distance (great-circle distance). We compute this ourselves rather
  // than relying on Places ordering so we can safely merge results across keyword
  // attempts and still pick the true nearest place.
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const haversineMeters = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => {
    const R = 6371_000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Normalize the service type from UI strings to Places "type".
  // (e.g. "police station" still maps to type="police".)
  const normalized = serviceType.trim().toLowerCase();
  const isEmergencySearch = normalized.includes("emergency");
  // NOTE: In the Emergency Services UX, people sometimes think in terms of
  // "emergency" rather than "hospital". We treat that as a hospital search.
  const type = normalized.includes("police")
    ? "police"
    : normalized.includes("hospital") || normalized.includes("emergency")
      ? "hospital"
      : normalized.includes("pharmacy")
        ? "pharmacy"
        : null;

  // Keyword strategies used on the Emergency Services page.
  // - Hospitals: must bias toward emergency-capable facilities.
  // - Police: must return actual police stations (not "emergency" anything).
  // We try multiple emergency-related terms because many ER-capable hospitals don't
  // match the single keyword "emergency" reliably.
  // If those queries only return specialty facilities (e.g., eye hospitals) or return
  // nothing, we do a final, keyword-less `type=hospital` fallback and still prefer a
  // non-specialty hospital by distance.
  const hospitalEmergencyKeywords = [
    // User expectation
    "emergency",
    // Common variants seen in Google Places data
    "emergency department",
    "emergency room",
    "emergency unit",
    "emergency hospital",
    // UK / Commonwealth phrasing
    "accident and emergency",
    "a&e",
    // Sri Lanka / Commonwealth naming patterns that often map to general hospitals.
    // These help avoid specialty-only facilities when "emergency" isn't present in the name.
    "general hospital",
    "base hospital",
    "teaching hospital",
  ];

  // For Emergency Services "emergency" searches, keep the behavior literal:
  // - First query must be keyword=emergency
  // - Choose the nearest (Haversine) from that result set
  // - Only fall back to a keyword-less hospital query if that returns nothing
  const hospitalKeywordsForThisQuery = isEmergencySearch
    ? ["emergency"]
    : hospitalEmergencyKeywords;

  // We intentionally do NOT rely on Google's ordering. Instead:
  // 1) Fetch a set of candidates near the user
  // 2) Compute the distance ourselves using Haversine
  // 3) Pick the minimum-distance place_id
  // We expand search radius until we have at least one candidate to choose from.
  // This avoids a hard single-radius limit while still bounding API calls.
  const radii = [5_000, 15_000, 40_000];

  /**
   * Chooses the best `place_id` from a Nearby Search result set.
   *
   * Returns multiple "tiers" for hospital searches:
   * - `bestEmergencyHospitalId`: emergency-like and non-specialty
   * - `bestGeneralHospitalId`: non-specialty (any)
   * - `bestAnyId`: absolute closest (fallback)
   */
  const pickClosestPlaceId = (
    results: any[],
  ): {
    bestAnyId: string | null;
    bestEmergencyHospitalId: string | null;
    bestGeneralHospitalId: string | null;
  } => {
    // For hospitals, we prefer non-specialty facilities first (general/emergency-capable).
    // If we can't find any, we fall back to the closest hospital of any kind.
    let bestAnyId: string | null = null;
    let bestAnyDist = Number.POSITIVE_INFINITY;

    let bestEmergencyHospitalId: string | null = null;
    let bestEmergencyHospitalDist = Number.POSITIVE_INFINITY;

    let bestGeneralHospitalId: string | null = null;
    let bestGeneralHospitalDist = Number.POSITIVE_INFINITY;

    for (const r of results) {
      const pid = r?.place_id;
      const loc = r?.geometry?.location;
      const rLat = typeof loc?.lat === "number" ? loc.lat : null;
      const rLng = typeof loc?.lng === "number" ? loc.lng : null;
      if (!pid || rLat === null || rLng === null) continue;

      // Defensive: ensure returned results still match the requested type.
      // (This should normally be true, but prevents odd edge cases.)
      if (type && Array.isArray(r?.types) && !r.types.includes(type)) {
        continue;
      }

      if (type === "police") {
        const name = String(r?.name ?? "");
        if (!isExactPoliceStationName(name)) continue;
      }

      const d = haversineMeters(lat, lng, rLat, rLng);

      // Track absolute closest candidate.
      if (d < bestAnyDist) {
        bestAnyDist = d;
        bestAnyId = String(pid);
      }

      // For hospitals, prefer non-specialty names when possible.
      if (type === "hospital") {
        const name = String(r?.name ?? "");

        // Tier 1: emergency-like and non-specialty.
        if (
          !isLikelySpecialtyHospitalName(name) &&
          isEmergencyLikeHospitalName(name) &&
          d < bestEmergencyHospitalDist
        ) {
          bestEmergencyHospitalDist = d;
          bestEmergencyHospitalId = String(pid);
        }

        // Tier 2: general (non-specialty) hospitals.
        if (
          !isLikelySpecialtyHospitalName(name) &&
          d < bestGeneralHospitalDist
        ) {
          bestGeneralHospitalDist = d;
          bestGeneralHospitalId = String(pid);
        }
      }
    }

    return {
      bestAnyId,
      bestEmergencyHospitalId,
      bestGeneralHospitalId,
    };
  };

  /**
   * Dedup results by `place_id` when we aggregate across multiple queries.
   *
   * We keep the first-seen object for that `place_id` because all we need for
   * selection is `place_id`, `geometry.location`, `name`, and `types`.
   */
  const mergeResultsByPlaceId = (results: any[]): any[] => {
    const map = new Map<string, any>();
    for (const r of results) {
      const pid = r?.place_id;
      if (!pid) continue;
      if (!map.has(String(pid))) map.set(String(pid), r);
    }
    return Array.from(map.values());
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const includeSecondPage = options?.includeSecondPage === true;

  // `includeSecondPage` is primarily for real device usage.
  // In tests we usually keep it `false` to avoid next_page_token delays.

  /**
   * Execute a Nearby Search query and return its `results[]` array.
   * Optionally fetches a second page (for real app usage; tests skip the wait).
   */
  const fetchNearbySearchResults = async (
    params: URLSearchParams,
    logLabel: string,
  ): Promise<any[]> => {
    const baseUrl =
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    const keyword = params.get("keyword");
    console.log(
      `[Google Search] Query: ${serviceType} | ${logLabel} | keyword=${keyword ?? "(none)"} | Status: ${data.status}`,
    );

    if (data.error_message) {
      console.error("API Error Message:", data.error_message);
    }

    // Places may return statuses like: OK | ZERO_RESULTS | OVER_QUERY_LIMIT | REQUEST_DENIED.
    // We treat anything other than OK as “no results” and let caller fall back.
    const out: any[] =
      data.status === "OK" && Array.isArray(data.results) ? data.results : [];

    // Optionally pull one more page. This helps when the best match isn't on the
    // first page (rare, but it happens with keyword-based queries).
    const token =
      typeof data?.next_page_token === "string" ? data.next_page_token : "";
    if (includeSecondPage && token) {
      // Google requires a short delay before a next_page_token becomes valid.
      // Skip the delay in tests to keep Jest fast.
      if (process.env.NODE_ENV !== "test") {
        await sleep(2000);
      }

      const tokenParams = new URLSearchParams({
        pagetoken: token,
        key: GOOGLE_API_KEY,
      });
      const tokenUrl = `${baseUrl}?${tokenParams.toString()}`;
      const r2 = await fetch(tokenUrl);
      const d2 = await r2.json();

      console.log(
        `[Google Search] Query: ${serviceType} | ${logLabel} | page=2 | Status: ${d2.status}`,
      );
      if (d2.error_message) {
        console.error("API Error Message:", d2.error_message);
      }
      if (d2.status === "OK" && Array.isArray(d2.results)) {
        out.push(...d2.results);
      }
    }

    return out;
  };

  try {
    // 1) Prefer rank-by-distance for typed queries so that the nearest candidates are returned.
    // This is especially important for police stations: prominence-based results within a radius
    // can omit the truly nearest station from the first page.
    if (type) {
      const baseParams = new URLSearchParams({
        location: `${lat},${lng}`,
        rankby: "distance",
        type,
        key: GOOGLE_API_KEY,
      });

      const attemptParams: URLSearchParams[] = [];

      // Emergency Services page behavior:
      // - Hospitals: bias toward emergency-capable facilities.
      // - Police: use an explicit police-station keyword (never "emergency").
      if (type === "hospital") {
        for (const kw of hospitalKeywordsForThisQuery) {
          const withKeyword = new URLSearchParams(baseParams);
          withKeyword.set("keyword", kw);
          attemptParams.push(withKeyword);
        }
      }
      if (type === "police") {
        const withPoliceStation = new URLSearchParams(baseParams);
        withPoliceStation.set("keyword", "police station");
        attemptParams.push(withPoliceStation);
      }
      // For Emergency Services, keep police strict; hospitals get a controlled
      // fallback (type-only) only when keyword attempts aren't good enough.
      if (type !== "hospital" && type !== "police")
        attemptParams.push(baseParams);

      const aggregated: any[] = [];
      for (const params of attemptParams) {
        const results = await fetchNearbySearchResults(
          params,
          "rankby=distance",
        );
        if (results.length) aggregated.push(...results);
      }

      // Hospital fallback behavior:
      // - Non-emergency: always include a typed hospital query (no keyword) to avoid
      //   missing nearby general hospitals.
      // - Emergency: only do the typed fallback if keyword=emergency returned nothing.
      if (type === "hospital") {
        const shouldFetchTypedFallback =
          !isEmergencySearch || aggregated.length === 0;

        if (shouldFetchTypedFallback) {
          const typedFallbackResults = await fetchNearbySearchResults(
            baseParams,
            "rankby=distance:fallback",
          );
          if (typedFallbackResults.length)
            aggregated.push(...typedFallbackResults);
        }
      }

      // Emergency Services strict types: pick nearest across ALL keyword attempts.
      // This prevents returning a farther result just because the first keyword
      // query happened to return something.
      if (aggregated.length) {
        const merged = mergeResultsByPlaceId(aggregated);
        const pick = pickClosestPlaceId(merged);

        if (type === "hospital") {
          // For an "emergency" search, don't allow the emergency-like-name tier to
          // override nearness; pick the nearest non-specialty hospital instead.
          if (!isEmergencySearch && pick.bestEmergencyHospitalId)
            return pick.bestEmergencyHospitalId;
          if (pick.bestGeneralHospitalId) return pick.bestGeneralHospitalId;
          if (pick.bestAnyId) return pick.bestAnyId;
        } else {
          if (pick.bestAnyId) return pick.bestAnyId;
        }
      }
    }

    // 2) Fallback: radius-based searches (useful if rank-by-distance returns no candidates).
    for (const radius of radii) {
      const baseParams = new URLSearchParams({
        location: `${lat},${lng}`,
        radius: String(radius),
        key: GOOGLE_API_KEY,
      });

      const attemptParams: URLSearchParams[] = [];

      if (type) {
        baseParams.set("type", type);

        // Emergency Services page: keyword biasing.
        // - Hospitals: try `keyword=emergency` first.
        // - Police: try `keyword=police station` first (do NOT use "emergency").
        if (type === "hospital") {
          for (const kw of hospitalKeywordsForThisQuery) {
            const withKeyword = new URLSearchParams(baseParams);
            withKeyword.set("keyword", kw);
            attemptParams.push(withKeyword);
          }
        }
        if (type === "police") {
          const withPoliceStation = new URLSearchParams(baseParams);
          withPoliceStation.set("keyword", "police station");
          attemptParams.push(withPoliceStation);
        }

        // Keep hospital/police strict; other types can fall back to plain typed query.
        if (type !== "hospital" && type !== "police")
          attemptParams.push(baseParams);
      } else {
        baseParams.set("keyword", serviceType);
        attemptParams.push(baseParams);
      }

      const aggregated: any[] = [];
      for (const params of attemptParams) {
        const results = await fetchNearbySearchResults(
          params,
          `radius=${radius}`,
        );
        if (results.length) aggregated.push(...results);
      }

      if (type === "hospital") {
        const shouldFetchTypedFallback =
          !isEmergencySearch || aggregated.length === 0;
        if (shouldFetchTypedFallback) {
          const fallbackResults = await fetchNearbySearchResults(
            baseParams,
            `radius=${radius}:fallback`,
          );
          if (fallbackResults.length) aggregated.push(...fallbackResults);
        }
      }

      if (aggregated.length) {
        const merged = mergeResultsByPlaceId(aggregated);
        const pick = pickClosestPlaceId(merged);

        if (type === "hospital" && !pick.bestGeneralHospitalId) {
          // Same fallback as above, but for radius searches: broaden to any hospital
          // without keywords and then prefer non-specialty hospitals.
          const fallbackResults = await fetchNearbySearchResults(
            baseParams,
            `radius=${radius}:fallback`,
          );
          const mergedWithFallback = mergeResultsByPlaceId([
            ...merged,
            ...fallbackResults,
          ]);
          const pick2 = pickClosestPlaceId(mergedWithFallback);
          if (pick2.bestEmergencyHospitalId)
            return pick2.bestEmergencyHospitalId;
          if (pick2.bestGeneralHospitalId) return pick2.bestGeneralHospitalId;
          if (pick2.bestAnyId) return pick2.bestAnyId;
        }

        if (type === "hospital") {
          if (!isEmergencySearch && pick.bestEmergencyHospitalId)
            return pick.bestEmergencyHospitalId;
          if (pick.bestGeneralHospitalId) return pick.bestGeneralHospitalId;
          if (pick.bestAnyId) return pick.bestAnyId;
        } else {
          if (pick.bestAnyId) return pick.bestAnyId;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Network Error in getNearbyPlaces:", error);
    return null;
  }
}

/**
 * Retrieves specific contact details using a Place ID.
 *
 * Used by Emergency Services when the user taps “Call”.
 * We intentionally request a small set of fields to keep payload size down.
 */
export async function getPlaceMobileNumber(
  placeId: string,
): Promise<string | null> {
  // We limit fields to name and phone to keep payload small and speed up dialing.
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`[Google Details] Status: ${data.status}`);

    if (data.status === "OK" && data.result) {
      console.log("Success: Retrieved details for", data.result.name);

      // Prioritize international format for better call compatibility
      return (
        data.result.international_phone_number ||
        data.result.formatted_phone_number ||
        null
      );
    }
    return null;
  } catch (error) {
    console.error("Details Fetch Error:", error);
    return null;
  }
}

/**
 * Autocomplete place suggestions by free-text query.
 * If `lat/lng` are provided, results are biased near that location.
 *
 * UI note:
 * - Returns a short list (max 8) to keep the dropdown fast and readable.
 */
export async function autocompletePlaces(
  input: string,
  lat?: number,
  lng?: number,
): Promise<PlaceSuggestion[]> {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    input: trimmed,
    key: GOOGLE_API_KEY,
    language: "en",
  });

  if (typeof lat === "number" && typeof lng === "number") {
    params.set("location", `${lat},${lng}`);
    params.set("radius", "50000");
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && Array.isArray(data.predictions)) {
      return data.predictions.slice(0, 8).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
      }));
    }

    if (data.error_message) {
      console.error("API Error Message:", data.error_message);
    }

    return [];
  } catch (error) {
    console.error("Network Error in autocompletePlaces:", error);
    return [];
  }
}

/**
 * Minimal place details for mapping.
 */
export async function getPlaceCoordinates(
  placeId: string,
): Promise<PlaceCoordinates | null> {
  const details = await getPlaceDetails(placeId);
  if (!details) return null;
  return {
    placeId: details.placeId,
    name: details.name,
    latitude: details.latitude,
    longitude: details.longitude,
  };
}

/**
 * Place details for showing a card and placing a marker.
 *
 * This is the “richer” call used on the Map screen when a place is selected.
 * We still constrain fields to what the UI actually renders.
 */
export async function getPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  // Main details call used by the Map selected-place bottom sheet.
  // We request only the fields we actually render (name/address/rating/photos/etc.).
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId,
  )}&fields=place_id,name,formatted_address,rating,user_ratings_total,reviews,types,geometry,photos,opening_hours,current_opening_hours,utc_offset,wheelchair_accessible_entrance,price_level,url,website,formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error(
        `[Google Place Details] Status: ${data.status} | placeId: ${placeId}`,
      );
      if (data.error_message) {
        console.error("API Error Message:", data.error_message);
      }
    }

    if (data.status === "OK" && data.result?.geometry?.location) {
      const loc = data.result.geometry.location;
      const photos: PlacePhoto[] | undefined = Array.isArray(data.result.photos)
        ? data.result.photos.slice(0, 8).flatMap((p: any) => {
            if (!p?.photo_reference) return [];
            return [
              {
                photoReference: String(p.photo_reference),
                width: typeof p.width === "number" ? p.width : undefined,
                height: typeof p.height === "number" ? p.height : undefined,
              } satisfies PlacePhoto,
            ];
          })
        : undefined;

      // We only keep review ratings (not full text) to keep UI lightweight.
      const reviews: PlaceReview[] | undefined = Array.isArray(
        data.result.reviews,
      )
        ? data.result.reviews.slice(0, 50).map((r: any) => ({
            rating: typeof r?.rating === "number" ? r.rating : undefined,
          }))
        : undefined;

      const phoneNumber: string | undefined =
        data.result.international_phone_number ||
        data.result.formatted_phone_number ||
        undefined;

      const isOpenNow: boolean | undefined =
        typeof data.result.current_opening_hours?.open_now === "boolean"
          ? data.result.current_opening_hours.open_now
          : typeof data.result.opening_hours?.open_now === "boolean"
            ? data.result.opening_hours.open_now
            : undefined;

      return {
        placeId: data.result.place_id || placeId,
        name: data.result.name || "Selected place",
        latitude: loc.lat,
        longitude: loc.lng,
        address: data.result.formatted_address,
        rating: data.result.rating,
        userRatingsTotal: data.result.user_ratings_total,
        reviews,
        types: Array.isArray(data.result.types) ? data.result.types : undefined,
        phoneNumber,
        website: data.result.website,
        googleMapsUrl: data.result.url,
        isOpenNow,
        nextOpenTimeText: computeNextOpenTimeText(data.result, isOpenNow),
        wheelchairAccessibleEntrance:
          typeof data.result.wheelchair_accessible_entrance === "boolean"
            ? data.result.wheelchair_accessible_entrance
            : undefined,
        priceLevel:
          typeof data.result.price_level === "number"
            ? data.result.price_level
            : undefined,
        photos,
      };
    }

    if (data.error_message) {
      console.error("API Error Message:", data.error_message);
    }

    return null;
  } catch (error) {
    console.error("Details Fetch Error in getPlaceDetails:", error);
    return null;
  }
}

/**
 * Build an image URL for a Places photo_reference (returned by Place Details).
 * The endpoint returns a redirect to the actual image.
 *
 * This helper only builds the URL; the UI decides when/if to fetch it.
 */
export function getPlacePhotoUrl(
  photoReference: string,
  maxWidth = 800,
): string | null {
  if (!photoReference) return null;
  if (!GOOGLE_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(
    String(maxWidth),
  )}&photo_reference=${encodeURIComponent(
    photoReference,
  )}&key=${encodeURIComponent(GOOGLE_API_KEY)}`;
}

/**
 * Nearby places for POI category buttons.
 *
 * Used by the Map screen POI chips (e.g., restaurant / police / hospital).
 * Returns a list of lightweight `NearbyPlace` items that can be drawn as markers.
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  keywordOrType: string,
  maxResults = 12,
  options?: { openNow?: boolean },
): Promise<NearbyPlace[]> {
  // Used by POI category chips on the Map screen.
  // - For police/hospital/pharmacy we use `type` (more consistent)
  // - For everything else we use `keyword` (more flexible)
  const openNowParam = options?.openNow ? "&opennow=true" : "";

  // Prefer `type` for well-defined POI categories (more reliable than keyword).
  let url = "";
  const useType =
    keywordOrType === "police" ||
    keywordOrType === "hospital" ||
    keywordOrType === "pharmacy";

  // Police is a broad category in Places, and can include sub-places around a
  // station. Bias to the exact phrase users expect.
  const strictPoliceStationKeywordParam =
    keywordOrType === "police" ? "&keyword=police%20station" : "";

  if (useType) {
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(
      `${lat},${lng}`,
    )}&rankby=distance&type=${encodeURIComponent(
      keywordOrType,
    )}${strictPoliceStationKeywordParam}${openNowParam}&key=${encodeURIComponent(GOOGLE_API_KEY)}`;
  } else {
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(
      `${lat},${lng}`,
    )}&rankby=distance&keyword=${encodeURIComponent(
      keywordOrType,
    )}${openNowParam}&key=${encodeURIComponent(GOOGLE_API_KEY)}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && Array.isArray(data.results)) {
      const raw = data.results.slice(0, maxResults);

      // For hospital POIs, prefer non-specialty hospitals first.
      // (Fallback to the raw list if we filtered everything out.)
      const preferred =
        keywordOrType === "hospital"
          ? raw.filter(
              (r: any) => !isLikelySpecialtyHospitalName(String(r?.name ?? "")),
            )
          : raw;

      const list = preferred.length ? preferred : raw;

      return list.flatMap((r: any) => {
        const loc = r?.geometry?.location;
        if (!loc) return [];

        // Defensive: when we queried with a strict `type`, only keep results
        // that actually advertise that type in `types`.
        if (useType) {
          const types: unknown = r?.types;
          if (!Array.isArray(types) || !types.includes(keywordOrType)) {
            return [];
          }
        }

        // Further restrict police tab to exact Police Stations only.
        if (keywordOrType === "police") {
          const name = String(r?.name ?? "");
          if (!isExactPoliceStationName(name)) return [];
        }

        return [
          {
            placeId: r.place_id,
            name: r.name,
            latitude: loc.lat,
            longitude: loc.lng,
            vicinity: r.vicinity,
            rating: r.rating,
            userRatingsTotal: r.user_ratings_total,
            types: Array.isArray(r.types) ? r.types : undefined,
            isOpenNow:
              typeof r.opening_hours?.open_now === "boolean"
                ? r.opening_hours.open_now
                : options?.openNow
                  ? true
                  : undefined,
            wheelchairAccessibleEntrance:
              typeof r.wheelchair_accessible_entrance === "boolean"
                ? r.wheelchair_accessible_entrance
                : undefined,
          } satisfies NearbyPlace,
        ];
      });
    }

    if (data.error_message) {
      console.error("API Error Message:", data.error_message);
    }

    return [];
  } catch (error) {
    console.error("Network Error in searchNearbyPlaces:", error);
    return [];
  }
}
