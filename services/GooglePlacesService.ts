const GOOGLE_API_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || "";

/**
 * Haversine Formula: Calculates the great-circle distance between two points
 * on Earth's surface given their latitude and longitude in decimal degrees.
 * Returns distance in kilometers.
 * Complexity: O(1)
 */
function calculateHaversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg: number) => (deg * Math.PI) / 180;

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
}

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
};

/**
 * Finds the closest place near a coordinate.
 * Useful when the map provider doesn't give a placeId on tap (e.g. iOS default provider).
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
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  serviceType: string,
): Promise<string | null> {
  // Logic: rankby=distance ensures the closest result is always index [0]
  // keyword= allows for broader matching (e.g., 'Hospital' vs 'Medical Center')
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&keyword=${serviceType}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Log the search result to your terminal for live debugging
    console.log(
      `[Google Search] Keyword: ${serviceType} | Status: ${data.status}`,
    );

    if (data.status === "OK" && data.results.length > 0) {
      // Return the ID of the nearest result found
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
  )}&fields=place_id,name,formatted_address,rating,user_ratings_total,types,geometry,photos,opening_hours,price_level,url,website,formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;

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
        isOpenNow:
          typeof data.result.opening_hours?.open_now === "boolean"
            ? data.result.opening_hours.open_now
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
  keyword: string,
  maxResults = 12,
): Promise<NearbyPlace[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&keyword=${encodeURIComponent(
    keyword,
  )}&key=${GOOGLE_API_KEY}`;

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
