const GOOGLE_API_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || "";

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

export type PlaceDetails = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
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

const parseHhmmToMinutes = (hhmm: unknown): number | null => {
  if (typeof hhmm !== "string") return null;
  if (!/^\d{4}$/.test(hhmm)) return null;
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(2, 4));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const formatMinutesTo12Hour = (minutes: number): string => {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
};

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
  const nowLocal = new Date(Date.now() + utcOffsetMinutes * 60_000);
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
export async function findNearestPlaceAt(
  lat: number,
  lng: number,
  radiusMeters = 40,
): Promise<NearbyPlace | null> {
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
 * Finds the unique Place ID for the absolute closest service.
 * Optimized for nationwide use by removing radius constraints.
 */
//call the near by places service with the cor-ordinates and the type of the place.
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  serviceType: string,
): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    console.error("[Google Search] Missing EXPO_PUBLIC_GOOGLE_API_KEY");
    return null;
  }

  // Original simple behavior:
  // - Use Places Nearby Search (Legacy) with rankby=distance
  // - Use keyword matching (can include clinics/medical centers)
  // - Return the first result (nearest in Google's distance-ranked list)
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(
    String(lat),
  )},${encodeURIComponent(
    String(lng),
  )}&rankby=distance&keyword=${encodeURIComponent(
    serviceType,
  )}&key=${encodeURIComponent(GOOGLE_API_KEY)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(
      `[Google Search] Keyword: ${serviceType} | Status: ${data.status}`,
    );

    if (
      data.status === "OK" &&
      Array.isArray(data.results) &&
      data.results[0]
    ) {
      return data.results[0].place_id;
    }

    if (data.error_message) {
      console.error("API Error Message:", data.error_message);
    }

    return null;
  } catch (error) {
    console.error("Network Error in getNearbyPlaces:", error);
    return null;
  }
}

/**
 * Retrieves specific contact details using a Place ID.
 */
export async function getPlaceMobileNumber(
  placeId: string,
): Promise<string | null> {
  // We limit fields to name and phone to optimize performance and data costs
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
 */
export async function getPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId,
  )}&fields=place_id,name,formatted_address,rating,user_ratings_total,types,geometry,photos,opening_hours,current_opening_hours,utc_offset,wheelchair_accessible_entrance,price_level,url,website,formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;

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
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  keywordOrType: string,
  maxResults = 12,
  options?: { openNow?: boolean },
): Promise<NearbyPlace[]> {
  const openNowParam = options?.openNow ? "&opennow=true" : "";

  // Use type for police and hospital, keyword for others
  let url = "";
  if (keywordOrType === "police" || keywordOrType === "hospital") {
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=${keywordOrType}${openNowParam}&key=${GOOGLE_API_KEY}`;
  } else {
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&keyword=${encodeURIComponent(
      keywordOrType,
    )}${openNowParam}&key=${GOOGLE_API_KEY}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && Array.isArray(data.results)) {
      return data.results.slice(0, maxResults).flatMap((r: any) => {
        const loc = r?.geometry?.location;
        if (!loc) return [];
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
