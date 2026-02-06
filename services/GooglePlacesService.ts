const GOOGLE_API_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || "";

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
