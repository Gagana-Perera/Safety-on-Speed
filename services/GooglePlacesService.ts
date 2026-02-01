// services/GooglePlacesService.ts

const GOOGLE_API_KEY: string = "AIzaSyCv6NXQO-MjGfKcLFd7pmSnQ28UkTkj-tQ";

export async function getNearbyPlaces(
  lat: number,
  lng: number,
  keyword: string,
): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&keyword=${keyword}&key=${GOOGLE_API_KEY}`;

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
}
