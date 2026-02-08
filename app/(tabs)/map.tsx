import { Image as ExpoImage } from "expo-image";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Feather } from "@expo/vector-icons";

import MapView, {
  LatLng,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  autocompletePlaces,
  findNearestPlaceAt,
  getPlaceDetails,
  getPlacePhotoUrl,
  NearbyPlace,
  PlaceDetails,
  PlaceSuggestion,
  searchNearbyPlaces,
} from "../../services/GooglePlacesService";

type Coords = { latitude: number; longitude: number };

export default function MapScreen() {
  const params = useLocalSearchParams<{ placeId?: string | string[] }>();
  const router = useRouter();

  const SRI_LANKA_CENTER = { latitude: 7.8731, longitude: 80.7718 };

  const mapRef = useRef<MapView | null>(null);

  const [coords, setCoords] = useState<Coords>(SRI_LANKA_CENTER);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: SRI_LANKA_CENTER.latitude,
    longitude: SRI_LANKA_CENTER.longitude,
    latitudeDelta: 2.5,
    longitudeDelta: 2.5,
  });

  const [loading, setLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [activePoiKey, setActivePoiKey] = useState<string | null>(null);

  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const [route, setRoute] = useState<{
    polyline: LatLng[];
    distanceText: string;
    durationText: string;
    destination: Coords;
  } | null>(null);

  const lastOpenedPlaceIdRef = useRef<string | null>(null);

  const makePhoneCall = async (phoneNumber: string) => {
    const cleaned = String(phoneNumber).replace(/[^\d+]/g, "");
    if (!cleaned) {
      Alert.alert("Invalid number", "This place has an invalid phone number.");
      return;
    }

    const url =
      Platform.OS === "ios" ? `telprompt:${cleaned}` : `tel:${cleaned}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Call not supported", "This device cannot place calls.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      console.error("[Call] openURL error:", e);
      Alert.alert("Call failed", "Could not open the phone dialer.");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Request permissions
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Location is required for safety features.",
          );
          setLocationDenied(true);
          setLoading(false);
          return;
        }

        // Get coordinates
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setHasLocation(true);

        const nextRegion: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 450);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Follow mode uses live location updates.
    if (!followUser || locationDenied) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }

    if (watchRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
          },
          (loc) => {
            if (cancelled) return;

            const next = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setCoords(next);
            setHasLocation(true);

            const nextRegion: Region = {
              latitude: next.latitude,
              longitude: next.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            setMapRegion(nextRegion);
            mapRef.current?.animateToRegion(nextRegion, 350);
          },
        );
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [followUser, locationDenied]);

  // Rough bounding box for Sri Lanka (keeps map from defaulting to a world view).
  const SRI_LANKA_BOUNDS = {
    minLat: 5.85,
    maxLat: 9.85,
    minLng: 79.4,
    maxLng: 82.1,
  };

  const isWithinSriLanka =
    coords.latitude >= SRI_LANKA_BOUNDS.minLat &&
    coords.latitude <= SRI_LANKA_BOUNDS.maxLat &&
    coords.longitude >= SRI_LANKA_BOUNDS.minLng &&
    coords.longitude <= SRI_LANKA_BOUNDS.maxLng;

  const displayCenter =
    hasLocation && isWithinSriLanka ? coords : SRI_LANKA_CENTER;

  const initialRegion = useMemo<Region>(
    () => ({
      latitude: displayCenter.latitude,
      longitude: displayCenter.longitude,
      latitudeDelta: hasLocation ? 0.01 : 2.5,
      longitudeDelta: hasLocation ? 0.01 : 2.5,
    }),
    [displayCenter.latitude, displayCenter.longitude, hasLocation],
  );

  useEffect(() => {
    const handle = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSuggestions([]);
        return;
      }

      if (!inputFocused) {
        setSuggestions([]);
        return;
      }

      const apiKey = ensureGoogleApiKey();
      if (!apiKey) {
        setSuggestions([]);
        return;
      }

      setAutoLoading(true);
      const list = await autocompletePlaces(
        trimmed,
        mapRegion.latitude,
        mapRegion.longitude,
      );
      setSuggestions(list);
      setAutoLoading(false);
    }, 250);

    return () => clearTimeout(handle);
  }, [query, mapRegion.latitude, mapRegion.longitude]);

  const recenter = () => {
    const nextRegion: Region = {
      latitude: displayCenter.latitude,
      longitude: displayCenter.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 450);
  };

  const formatCount = (n?: number) => {
    if (typeof n !== "number") return "";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const selectPlaceById = async (
    placeId: string,
    fallback?: PlaceDetails,
  ): Promise<PlaceDetails | null> => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) {
      if (fallback) setSelectedPlace(fallback);
      return fallback || null;
    }
    if (fallback) {
      setSelectedPlace(fallback);
    }
    setPlaceError(null);
    setPlaceLoading(true);
    try {
      const details = await getPlaceDetails(placeId);
      if (!details) {
        setPlaceError(
          "Could not load photos/details for this place. Check Places API + billing + API key restrictions.",
        );
      } else {
        setSelectedPlace(details);
      }
      setRoute(null);
      return details || fallback || null;
    } catch (e) {
      console.error("selectPlaceById error:", e);
      setPlaceError("Unexpected error while loading place details.");
      return fallback || null;
    } finally {
      setPlaceLoading(false);
    }
  };

  const moveToPlace = (p: { latitude: number; longitude: number }) => {
    const nextRegion: Region = {
      latitude: p.latitude,
      longitude: p.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 450);
  };

  const distanceMeters = (a: Coords, b: Coords) => {
    const R = 6371000;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  };

  const formatDistance = (meters: number): string => {
    if (!Number.isFinite(meters) || meters <= 0) return "";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getCategoryLabel = (types?: string[]): string => {
    const list = Array.isArray(types) ? types : [];
    if (list.includes("hospital")) return "Hospital";
    if (list.includes("police")) return "Police";
    if (list.includes("gas_station")) return "Fuel";
    if (list.includes("pharmacy")) return "Pharmacy";
    if (list.includes("restaurant")) return "Food";
    return "Place";
  };

  const getSafetyNote = (types?: string[]): string | null => {
    const list = Array.isArray(types) ? types : [];
    if (list.includes("hospital")) {
      return "Safe zone nearby. This hospital can help in emergencies.";
    }
    if (list.includes("police")) {
      return "Safe zone nearby. This police station can assist you.";
    }
    return null;
  };

  const sharePlace = async (place: PlaceDetails) => {
    const url =
      place.googleMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.latitude},${place.longitude}`,
      )}`;

    const lines = [place.name];
    if (place.address) lines.push(place.address);
    lines.push(url);

    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // ignore
    }
  };

  const ensureGoogleApiKey = (): string | null => {
    const key = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    if (!key) {
      Alert.alert(
        "Missing API key",
        "Set EXPO_PUBLIC_GOOGLE_API_KEY in your .env to enable Places/Directions.",
      );
      return null;
    }
    return key;
  };

  const decodePolyline = (encoded: string): LatLng[] => {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates: LatLng[] = [];

    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return coordinates;
  };

  const fetchDirections = async (destination: Coords) => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) return;

    if (!hasLocation) {
      Alert.alert("Location required", "Enable location to get directions.");
      return;
    }

    setDirectionsLoading(true);
    try {
      const origin = `${coords.latitude},${coords.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin,
      )}&destination=${encodeURIComponent(dest)}&mode=driving&key=${encodeURIComponent(
        apiKey,
      )}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data || data.status !== "OK" || !Array.isArray(data.routes)) {
        console.error("[Directions]", data?.status, data?.error_message);
        Alert.alert("Directions unavailable", "Could not fetch a route.");
        return;
      }

      const firstRoute = data.routes[0];
      const encoded: string | undefined = firstRoute?.overview_polyline?.points;
      const leg = Array.isArray(firstRoute?.legs) ? firstRoute.legs[0] : null;

      const polyline = encoded ? decodePolyline(encoded) : [];

      setRoute({
        polyline,
        distanceText: leg?.distance?.text || "",
        durationText: leg?.duration?.text || "",
        destination,
      });

      if (polyline.length) {
        mapRef.current?.fitToCoordinates(polyline, {
          edgePadding: { top: 160, right: 40, bottom: 240, left: 40 },
          animated: true,
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not fetch directions.");
    } finally {
      setDirectionsLoading(false);
    }
  };

  const POI_CATEGORIES = [
    { key: "police", label: "Police", keyword: "police station" },
    { key: "hospital", label: "Hospitals", keyword: "hospital" },
    { key: "pharmacy", label: "Pharmacies", keyword: "pharmacy" },
    { key: "fuel", label: "Fuel", keyword: "gas station" },
  ] as const;

  const loadPoiCategory = async (key: string, keyword: string) => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) return;

    setActivePoiKey(key);
    setPoiLoading(true);
    try {
      const list = await searchNearbyPlaces(
        mapRegion.latitude,
        mapRegion.longitude,
        keyword,
      );

      setNearbyPlaces(list);
      setSelectedPlace(null);
      setRoute(null);

      if (list.length) {
        mapRef.current?.fitToCoordinates(
          list.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
          {
            edgePadding: { top: 180, right: 40, bottom: 220, left: 40 },
            animated: true,
          },
        );
      } else {
        Alert.alert("No results", `No nearby ${keyword} found.`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not load nearby places.");
    } finally {
      setPoiLoading(false);
    }
  };

  const onPickSuggestion = async (s: PlaceSuggestion) => {
    setQuery(s.description);
    setSuggestions([]);
    setInputFocused(false);
    Keyboard.dismiss();

    // Show the sheet immediately (Google Maps style), then hydrate with real details.
    const fallback: PlaceDetails = {
      placeId: s.placeId,
      name: s.description,
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
    };

    const details = await selectPlaceById(s.placeId, fallback);
    if (!details) {
      Alert.alert("Not Found", "Could not load that place.");
      return;
    }

    setNearbyPlaces([]);
    setActivePoiKey(null);
    moveToPlace(details);
  };

  useEffect(() => {
    const raw = params?.placeId;
    const placeId = Array.isArray(raw) ? raw[0] : raw;
    if (!placeId) return;
    if (lastOpenedPlaceIdRef.current === placeId) return;

    lastOpenedPlaceIdRef.current = placeId;
    setInputFocused(false);
    Keyboard.dismiss();
    setSuggestions([]);

    void (async () => {
      const details = await selectPlaceById(placeId);
      if (details) {
        setNearbyPlaces([]);
        setActivePoiKey(null);
        moveToPlace(details);
      }
    })();
  }, [params?.placeId]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.mapWrap}>
        <MapView
          ref={(ref) => {
            mapRef.current = ref;
          }}
          style={styles.map}
          {...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE } : {})}
          initialRegion={initialRegion}
          onRegionChangeComplete={(r) => setMapRegion(r)}
          showsUserLocation={hasLocation}
          showsMyLocationButton={Platform.OS === "android"}
          showsCompass
          toolbarEnabled={Platform.OS === "android"}
          showsTraffic={trafficEnabled}
          rotateEnabled
          pitchEnabled
          zoomEnabled
          scrollEnabled
          onPress={(e) => {
            // Make single-tap feel like Google Maps: try to open nearest place.
            // (Especially useful on iOS where POI taps don't provide a placeId.)
            const apiKey = ensureGoogleApiKey();
            if (!apiKey) return;
            const c = e?.nativeEvent?.coordinate;
            if (!c) return;
            if (placeLoading || directionsLoading) return;

            void (async () => {
              const nearest = await findNearestPlaceAt(
                c.latitude,
                c.longitude,
                45,
              );
              if (!nearest) return;

              const tap = { latitude: c.latitude, longitude: c.longitude };
              const found = {
                latitude: nearest.latitude,
                longitude: nearest.longitude,
              };
              // Only accept if truly near the tap to avoid random matches.
              if (distanceMeters(tap, found) > 70) return;

              const fallback: PlaceDetails = {
                placeId: nearest.placeId,
                name: nearest.name,
                latitude: nearest.latitude,
                longitude: nearest.longitude,
                address: nearest.vicinity,
                rating: nearest.rating,
                userRatingsTotal: nearest.userRatingsTotal,
                types: nearest.types,
              };
              const details = await selectPlaceById(nearest.placeId, fallback);
              if (details) moveToPlace(details);
            })();
          }}
          onLongPress={(e) => {
            const apiKey = ensureGoogleApiKey();
            if (!apiKey) return;
            const c = e?.nativeEvent?.coordinate;
            if (!c) return;
            void (async () => {
              const nearest = await findNearestPlaceAt(c.latitude, c.longitude);
              if (!nearest) {
                Alert.alert(
                  "No place found",
                  "Try long-pressing closer to a place icon/name.",
                );
                return;
              }
              const fallback: PlaceDetails = {
                placeId: nearest.placeId,
                name: nearest.name,
                latitude: nearest.latitude,
                longitude: nearest.longitude,
                address: nearest.vicinity,
                rating: nearest.rating,
                userRatingsTotal: nearest.userRatingsTotal,
                types: nearest.types,
              };
              const details = await selectPlaceById(nearest.placeId, fallback);
              if (details) moveToPlace(details);
            })();
          }}
          {...(Platform.OS === "android"
            ? {
                // Google POI taps (Android + Google provider) can provide a placeId.
                onPoiClick: (e: any) => {
                  const placeId = e?.nativeEvent?.placeId;
                  const name = e?.nativeEvent?.name;
                  if (!placeId) return;
                  void (async () => {
                    const details = await selectPlaceById(placeId, {
                      placeId,
                      name: name || "Selected place",
                      latitude: e?.nativeEvent?.coordinate?.latitude,
                      longitude: e?.nativeEvent?.coordinate?.longitude,
                    });
                    if (details) moveToPlace(details);
                  })();
                },
              }
            : {})}
        >
          {hasLocation && (
            <Marker
              coordinate={coords}
              title="You"
              description="Current location"
              onPress={() => {
                setSelectedPlace(null);
                setRoute(null);
              }}
            />
          )}

          {selectedPlace && (
            <Marker
              coordinate={{
                latitude: selectedPlace.latitude,
                longitude: selectedPlace.longitude,
              }}
              title={selectedPlace.name}
              description={selectedPlace.address || selectedPlace.placeId}
              pinColor="#E11D48"
              onCalloutPress={() => {
                void selectPlaceById(selectedPlace.placeId, selectedPlace);
              }}
            />
          )}

          {nearbyPlaces.map((p) => (
            <Marker
              key={p.placeId}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
              description={p.vicinity}
              onPress={() => {
                const fallback: PlaceDetails = {
                  placeId: p.placeId,
                  name: p.name,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  address: p.vicinity,
                  rating: p.rating,
                  userRatingsTotal: p.userRatingsTotal,
                  types: p.types,
                };
                void (async () => {
                  const details = await selectPlaceById(p.placeId, fallback);
                  if (details) moveToPlace(details);
                })();
              }}
              onCalloutPress={() => {
                const fallback: PlaceDetails = {
                  placeId: p.placeId,
                  name: p.name,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  address: p.vicinity,
                  rating: p.rating,
                  userRatingsTotal: p.userRatingsTotal,
                  types: p.types,
                };
                void (async () => {
                  const details = await selectPlaceById(p.placeId, fallback);
                  if (details) moveToPlace(details);
                })();
              }}
            />
          ))}

          {route?.polyline?.length ? (
            <Polyline
              coordinates={route.polyline}
              strokeWidth={5}
              strokeColor="#0EA5E9"
            />
          ) : null}
        </MapView>

        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search places"
              placeholderTextColor="rgba(0,0,0,0.45)"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => {
                if (suggestions.length) {
                  void onPickSuggestion(suggestions[0]);
                }
              }}
            />
            <TouchableOpacity
              style={styles.recenterButton}
              onPress={recenter}
              disabled={loading}
            >
              <Text style={styles.recenterText}>◎</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.recenterButton, followUser && styles.toggleActive]}
              onPress={() => setFollowUser((v) => !v)}
              disabled={locationDenied}
            >
              <Text style={styles.recenterText}>F</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.recenterButton,
                trafficEnabled && styles.toggleActive,
              ]}
              onPress={() => setTrafficEnabled((v) => !v)}
            >
              <Text style={styles.recenterText}>T</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.poiRow}
          >
            {POI_CATEGORIES.map((c) => {
              const active = activePoiKey === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => void loadPoiCategory(c.key, c.keyword)}
                  style={[styles.poiChip, active && styles.poiChipActive]}
                  disabled={poiLoading}
                >
                  <Text
                    style={[
                      styles.poiChipText,
                      active && styles.poiChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {inputFocused && (autoLoading || suggestions.length > 0) && (
            <View style={styles.suggestions}>
              {autoLoading && (
                <Text style={styles.suggestionLoading}>Searching…</Text>
              )}
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(item) => item.placeId}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => onPickSuggestion(item)}
                  >
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {selectedPlace && (
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {(placeLoading || directionsLoading) && (
              <View style={styles.sheetLoadingRow}>
                <ActivityIndicator size="small" color="#2F6FED" />
                <Text style={styles.sheetLoadingText}>
                  {placeLoading ? "Loading details…" : "Loading route…"}
                </Text>
              </View>
            )}

            {placeError ? (
              <Text style={styles.sheetErrorText}>{placeError}</Text>
            ) : null}

            {selectedPlace.photos?.length ? (
              <FlatList
                horizontal
                data={selectedPlace.photos}
                keyExtractor={(p) => p.photoReference}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sheetPhotosRow}
                renderItem={({ item }) => {
                  const url = getPlacePhotoUrl(item.photoReference, 900);
                  if (!url) return null;
                  return (
                    <ExpoImage
                      source={{ uri: url }}
                      style={styles.sheetPhoto}
                      onError={(e) => {
                        console.error("[Place Photo] load error:", url, e);
                      }}
                      contentFit="cover"
                    />
                  );
                }}
              />
            ) : (
              <Text style={styles.sheetPhotosEmpty}>
                No photos available for this place.
              </Text>
            )}

            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderIcon}>
                <Feather
                  name={
                    getCategoryLabel(selectedPlace.types) === "Hospital"
                      ? "plus"
                      : getCategoryLabel(selectedPlace.types) === "Police"
                        ? "shield"
                        : "map-pin"
                  }
                  size={18}
                  color="#0B253A"
                />
              </View>

              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {selectedPlace.name}
                </Text>

                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {getCategoryLabel(selectedPlace.types)}
                  {hasLocation
                    ? ` • ${formatDistance(
                        distanceMeters(coords, {
                          latitude: selectedPlace.latitude,
                          longitude: selectedPlace.longitude,
                        }),
                      )} away`
                    : ""}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelectedPlace(null);
                  setRoute(null);
                }}
                style={styles.sheetClose}
              >
                <Feather name="x" size={18} color="#0B253A" />
              </TouchableOpacity>
            </View>

            {selectedPlace.address ? (
              <Text style={styles.sheetAddress} numberOfLines={2}>
                {selectedPlace.address}
              </Text>
            ) : null}

            <View style={styles.sheetMetaRow}>
              {typeof selectedPlace.rating === "number" ? (
                <Text style={styles.sheetMetaPill}>
                  ⭐ {selectedPlace.rating.toFixed(1)}
                  {typeof selectedPlace.userRatingsTotal === "number"
                    ? ` (${formatCount(selectedPlace.userRatingsTotal)})`
                    : ""}
                </Text>
              ) : null}
              {typeof selectedPlace.isOpenNow === "boolean" ? (
                <Text
                  style={[
                    styles.sheetMetaPill,
                    selectedPlace.isOpenNow ? styles.openNow : styles.closedNow,
                  ]}
                >
                  {selectedPlace.isOpenNow ? "Open now" : "Closed"}
                </Text>
              ) : null}
            </View>

            {route ? (
              <Text style={styles.sheetMeta}>
                ETA: {route.durationText} • {route.distanceText}
              </Text>
            ) : null}

            <View style={styles.sheetActionsRow}>
              <TouchableOpacity
                style={[styles.sheetActionBtn, styles.actionNeutral]}
                onPress={() => {
                  if (!selectedPlace.phoneNumber) {
                    Alert.alert(
                      "No phone number",
                      "This place doesn't have a phone number listed.",
                    );
                    return;
                  }
                  void makePhoneCall(selectedPlace.phoneNumber);
                }}
              >
                <Feather name="phone" size={16} color="#0B253A" />
                <Text style={styles.sheetActionText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetActionBtn, styles.actionBlue]}
                onPress={() =>
                  void fetchDirections({
                    latitude: selectedPlace.latitude,
                    longitude: selectedPlace.longitude,
                  })
                }
              >
                <Feather name="navigation" size={16} color="#0B253A" />
                <Text style={styles.sheetActionText}>Route</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetActionBtn, styles.actionRed]}
                onPress={() => {
                  Alert.alert("Emergency", "Open Emergency Services?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Open",
                      style: "default",
                      onPress: () => router.push("/(tabs)/extra"),
                    },
                  ]);
                }}
              >
                <Feather name="alert-triangle" size={16} color="#0B253A" />
                <Text style={styles.sheetActionText}>SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetActionBtn, styles.actionGreen]}
                onPress={() => void sharePlace(selectedPlace)}
              >
                <Feather name="share-2" size={16} color="#0B253A" />
                <Text style={styles.sheetActionText}>Share</Text>
              </TouchableOpacity>
            </View>

            {getSafetyNote(selectedPlace.types) ? (
              <View style={styles.sheetSafetyCard}>
                <View style={styles.sheetSafetyIcon}>
                  <Feather name="shield" size={16} color="#0B253A" />
                </View>
                <View style={styles.sheetSafetyTextWrap}>
                  <Text style={styles.sheetSafetyTitle}>Safe zone nearby.</Text>
                  <Text style={styles.sheetSafetyText} numberOfLines={2}>
                    {getSafetyNote(selectedPlace.types)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {locationDenied && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Location is disabled — showing Sri Lanka.
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#FF0000" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B253A" },
  mapWrap: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  searchWrap: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#DCEBFF",
    borderWidth: 1,
    borderColor: "#2F6FED",
  },
  recenterText: {
    fontSize: 18,
    color: "#0B253A",
  },
  poiRow: {
    paddingTop: 10,
    paddingHorizontal: 2,
    gap: 8,
  },
  poiChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  poiChipActive: {
    backgroundColor: "#2F6FED",
    borderColor: "#2F6FED",
  },
  poiChipText: {
    fontSize: 12,
    color: "#0B253A",
    fontWeight: "600",
  },
  poiChipTextActive: {
    color: "#fff",
  },
  suggestions: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    maxHeight: 260,
  },
  suggestionLoading: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "rgba(0,0,0,0.55)",
    fontSize: 12,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  suggestionText: {
    color: "#111",
    fontSize: 14,
  },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 20,
    elevation: 5,
  },
  loadingText: {
    marginTop: 6,
    color: "#111",
    fontSize: 12,
    textAlign: "center",
  },
  banner: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bannerText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAddress: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(11,37,58,0.75)",
  },
  sheetLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
  },
  sheetLoadingText: {
    fontSize: 12,
    color: "rgba(0,0,0,0.6)",
    fontWeight: "600",
  },
  sheetErrorText: {
    marginBottom: 8,
    color: "rgba(185,28,28,0.95)",
    fontSize: 12,
    fontWeight: "600",
  },
  sheetPhotosRow: {
    gap: 10,
    paddingBottom: 10,
  },
  sheetPhotosEmpty: {
    paddingBottom: 10,
    color: "rgba(0,0,0,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },
  sheetPhoto: {
    width: 120,
    height: 74,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B253A",
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(11,37,58,0.8)",
  },
  sheetMeta: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(0,0,0,0.6)",
  },
  sheetMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetMetaPill: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    color: "rgba(0,0,0,0.75)",
    overflow: "hidden",
  },
  openNow: {
    backgroundColor: "rgba(16,185,129,0.16)",
    color: "#065F46",
  },
  closedNow: {
    backgroundColor: "rgba(239,68,68,0.12)",
    color: "#991B1B",
  },
  sheetActionsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  sheetActionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  sheetActionText: {
    color: "#0B253A",
    fontWeight: "800",
    fontSize: 13,
  },
  actionNeutral: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  actionBlue: {
    backgroundColor: "rgba(47,111,237,0.14)",
  },
  actionRed: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  actionGreen: {
    backgroundColor: "rgba(16,185,129,0.16)",
  },
  sheetSafetyCard: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(254,148,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(254,148,0,0.18)",
  },
  sheetSafetyIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSafetyTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  sheetSafetyTitle: {
    color: "#0B253A",
    fontWeight: "900",
    fontSize: 13,
  },
  sheetSafetyText: {
    marginTop: 2,
    color: "rgba(11,37,58,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
});
