import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
      let result = 0;
      let shift = 0;
      let b: number;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      result = 0;
      shift = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return coordinates;
  };

  const fetchDirections = async (destination: Coords) => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) return;
    if (!hasLocation) {
      Alert.alert("Location needed", "Enable location to get directions.");
      return;
    }

    try {
      setDirectionsLoading(true);
      const origin = `${coords.latitude},${coords.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin,
      )}&destination=${encodeURIComponent(dest)}&mode=driving&key=${encodeURIComponent(
        apiKey,
      )}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.routes?.length) {
        Alert.alert(
          "Directions error",
          data.error_message || "No route found.",
        );
        return;
      }

      const first = data.routes[0];
      const leg = first.legs?.[0];
      const points = first.overview_polyline?.points;
      if (!leg || !points) {
        Alert.alert("Directions error", "Route data missing.");
        return;
      }

      const poly = decodePolyline(points);
      setRoute({
        polyline: poly,
        distanceText: leg.distance?.text || "",
        durationText: leg.duration?.text || "",
        destination,
      });

      mapRef.current?.fitToCoordinates(
        [
          { latitude: coords.latitude, longitude: coords.longitude },
          destination,
          ...poly,
        ],
        {
          edgePadding: { top: 140, right: 40, bottom: 240, left: 40 },
          animated: true,
        },
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Directions error", "Could not fetch directions.");
    } finally {
      setDirectionsLoading(false);
    }
  };

  const POI_CATEGORIES: Array<{ key: string; label: string; keyword: string }> =
    [
      { key: "hospital", label: "Hospitals", keyword: "hospital" },
      { key: "police", label: "Police", keyword: "police station" },
      { key: "fuel", label: "Fuel", keyword: "gas station" },
      { key: "pharmacy", label: "Pharmacy", keyword: "pharmacy" },
      { key: "restaurant", label: "Food", keyword: "restaurant" },
    ];

  const loadPoiCategory = async (catKey: string, keyword: string) => {
    const apiKey = ensureGoogleApiKey();
    if (!apiKey) return;

    setPoiLoading(true);
    setActivePoiKey(catKey);
    setPlaceError(null);
    try {
      const base = hasLocation ? coords : displayCenter;
      const list = await searchNearbyPlaces(
        base.latitude,
        base.longitude,
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
                    <Image
                      source={{ uri: url }}
                      style={styles.sheetPhoto}
                      resizeMode="cover"
                      onError={(e) => {
                        console.error(
                          "[Place Photo] load error:",
                          url,
                          e?.nativeEvent,
                        );
                      }}
                    />
                  );
                }}
              />
            ) : null}

            <Text style={styles.sheetTitle} numberOfLines={1}>
              {selectedPlace.name}
            </Text>
            {selectedPlace.address ? (
              <Text style={styles.sheetSubtitle} numberOfLines={2}>
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
              {typeof selectedPlace.priceLevel === "number" ? (
                <Text style={styles.sheetMetaPill}>
                  {"$".repeat(
                    Math.max(1, Math.min(4, selectedPlace.priceLevel)),
                  )}
                </Text>
              ) : null}
            </View>

            {route ? (
              <Text style={styles.sheetMeta}>
                ETA: {route.durationText} • {route.distanceText}
              </Text>
            ) : null}

            <View style={styles.sheetRow}>
              <TouchableOpacity
                style={styles.sheetButtonPrimary}
                onPress={() =>
                  void fetchDirections({
                    latitude: selectedPlace.latitude,
                    longitude: selectedPlace.longitude,
                  })
                }
              >
                <Text style={styles.sheetButtonPrimaryText}>Directions</Text>
              </TouchableOpacity>

              {selectedPlace.phoneNumber ? (
                <TouchableOpacity
                  style={styles.sheetButton}
                  onPress={() =>
                    void Linking.openURL(
                      `tel:${selectedPlace.phoneNumber?.replace(/\s+/g, "")}`,
                    )
                  }
                >
                  <Text style={styles.sheetButtonText}>Call</Text>
                </TouchableOpacity>
              ) : null}

              {selectedPlace.website ? (
                <TouchableOpacity
                  style={styles.sheetButton}
                  onPress={() => void Linking.openURL(selectedPlace.website!)}
                >
                  <Text style={styles.sheetButtonText}>Website</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.sheetButton}
                onPress={() => setRoute(null)}
              >
                <Text style={styles.sheetButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetButton}
                onPress={() => {
                  setSelectedPlace(null);
                  setRoute(null);
                }}
              >
                <Text style={styles.sheetButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
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
  sheetRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  sheetButtonPrimary: {
    flex: 1,
    backgroundColor: "#2F6FED",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetButtonPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  sheetButton: {
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetButtonText: {
    color: "#0B253A",
    fontWeight: "700",
    fontSize: 13,
  },
});
