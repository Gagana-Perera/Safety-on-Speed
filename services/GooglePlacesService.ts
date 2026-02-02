// services/GooglePlacesService.ts

/*const GOOGLE_API_KEY: string = "AIzaSyCv6NXQO-MjGfKcLFd7pmSnQ28UkTkj-tQ";

export async function getNearbyPlaces(
  lat: number,
  lng: number,
  keyword: string,
): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&keyword=${keyword}&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results.length) {
    return null;
  }

  return data.results[0].place_id;
}

export async function getPlaceMobileNumber(
  placeId: string,
): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    return null;
  }

  return (
    data.result?.international_phone_number ||
    data.result?.formatted_phone_number ||
    null
  );
}*/

// services/GooglePlacesService.ts

const GOOGLE_API_KEY: string = "AIzaSyDh2IUZ-vFtUXhx93gQo040VoMchN-57qY";

export async function getNearbyPlaces(
  lat: number,
  lng: number,
  serviceType: string, // Changed 'keyword' to 'serviceType'
): Promise<string | null> {
  // Use 'type' for higher accuracy (e.g., 'police' or 'hospital')
  //const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${serviceType}&key=${GOOGLE_API_KEY}`;

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&keyword=${serviceType}&key=${GOOGLE_API_KEY}`;

  // Important: When using rankby=distance, you MUST remove the 'radius' parameter

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("GOOGLE SEARCH STATUS:", data.status); // Log this to your terminal!

    if (data.status !== "OK" || !data.results.length) {
      if (data.error_message)
        console.error("Google Error:", data.error_message);
      return null;
    }

    return data.results[0].place_id;
  } catch (error) {
    console.error("Network Error:", error);
    return null;
  }
}

export async function getPlaceMobileNumber(
  placeId: string,
): Promise<string | null> {
  // Added 'name' to fields so you can verify you found the right place in logs
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,international_phone_number&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("GOOGLE DETAILS STATUS:", data.status);

    if (data.status !== "OK" || !data.result) {
      return null;
    }

    console.log("Found Phone for:", data.result.name);

    return (
      data.result.international_phone_number ||
      data.result.formatted_phone_number ||
      null
    );
  } catch (error) {
    console.error("Details Error:", error);
    return null;
  }
}
