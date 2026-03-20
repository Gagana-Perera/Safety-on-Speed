import { Ionicons } from "@expo/vector-icons";
// Emergency Services tab:
// - Shows hotline numbers (static)
// - Finds the nearest hospital/police station using GPS + Google Places
// - Supports: Call (dial the place phone) and Map (open in-app map by placeId)
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackButton from "../backButton";
import { useTheme } from "@/components/theme/ThemeContext";

import {
  getNearbyPlaces,
  getPlaceMobileNumber,
} from "../../services/GooglePlacesService";

interface ServiceItem {
  id: string;
  name: string;
  phone: string;
  icon: keyof typeof Ionicons.glyphMap;
  hasMap: boolean;
  category: "hotline" | "place";
  // For category="place": query string used by Places search.
  // Examples: "hospital", "police station".
  searchKey?: string;
}

// UI cards are driven entirely by this data structure.
const SERVICES: ServiceItem[] = [
  {
    id: "1",
    name: "119",
    phone: "119",
    icon: "shield-checkmark-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "2",
    name: "Ambulance service",
    phone: "1990",
    icon: "car-sport-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "3",
    name: "Fire & Rescue",
    phone: "110",
    icon: "flame-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "4",
    name: "Women & Child Bureau",
    phone: "1938",
    icon: "heart-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "5",
    name: "Hospital",
    phone: "",
    icon: "add-circle-outline",
    hasMap: true,
    category: "place",
    searchKey: "emergency",
  },
  {
    id: "6",
    name: "Police Station",
    phone: "",
    icon: "shield-outline",
    hasMap: true,
    category: "place",
    searchKey: "police station",
  },
];

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

function PopTouchableOpacity(
  props: React.ComponentProps<typeof TouchableOpacity> & {
    popScale?: number;
    popTranslateY?: number;
  },
) {
  const {
    popScale = 1.04,
    popTranslateY = -2,
    disabled,
    onPressIn,
    onPressOut,
    style,
    activeOpacity,
    ...rest
  } = props;

  const scale = React.useRef(new Animated.Value(1)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;

  const animateTo = (nextScale: number, nextTranslateY: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: nextScale,
        speed: 28,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: nextTranslateY,
        speed: 28,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <AnimatedTouchableOpacity
      {...rest}
      disabled={disabled}
      activeOpacity={activeOpacity ?? 1}
      onPressIn={(e) => {
        if (!disabled) animateTo(popScale, popTranslateY);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1, 0);
        onPressOut?.(e);
      }}
      style={[
        style,
        {
          transform: [{ scale }, { translateY }],
        },
      ]}
    />
  );
}

export default function EmergencyServices() {
  const router = useRouter();
  const { theme } = useTheme();

  const EMERGENCY_ICON_COLOR = theme.mode === "light" ? "#000000" : "#8FD3FF";

  const EMERGENCY_BORDER_COLOR = "#2A5068";
  const EMERGENCY_BORDER_WIDTH = 2;
  const EMERGENCY_BUTTON_BORDER_WIDTH = 1;

  // Buttons should use the same border color as the icons (light blue).
  const visibleBorderColor = EMERGENCY_ICON_COLOR;
  const visibleBorderWidth = EMERGENCY_BUTTON_BORDER_WIDTH;

  // Tracks the loading spinner per-card and per-action.
  // This avoids locking the whole screen while one Places request is in flight.
  const [loadingStatus, setLoadingStatus] = useState<{
    id: string;
    type: "call" | "map";
  } | null>(null);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const locationWatchRef = React.useRef<Location.LocationSubscription | null>(
    null,
  );

  const haversineMeters = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371_000;
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

  const delay = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const MAP_QUICK_NAV_MS = 75;

  // Cache nearest placeId/phone for "place" cards so buttons feel instant.
  // (Prefetch is skipped in Jest tests to keep them deterministic.)
  const placeCacheRef = React.useRef<
    Record<string, { placeId?: string | null; phone?: string | null }>
  >({});
  const placeInFlightRef = React.useRef<
    Record<string, Promise<string | null> | undefined>
  >({});
  const phoneInFlightRef = React.useRef<
    Record<string, Promise<string | null> | undefined>
  >({});

  // GPS bootstrap:
  // - Ask permission
  // - Check if services are enabled
  // - Use last-known for fast initial UI
  // - Then refresh with a high-accuracy fix
  useEffect(() => {
    (async () => {
      try {
        setGpsError(null);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setGpsError("Permission denied");
          Alert.alert(
            "Permission Denied",
            "GPS is required to find help near you.",
          );
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setGpsError("Location services disabled");
          Alert.alert(
            "Location Services Off",
            "Please enable Location Services / GPS to find nearby help.",
          );
          return;
        }

        // Use last known location first (faster), then refresh with a high-accuracy fix.
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          setUserLocation({
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
          });
        }

        // Keep updating location while this screen is visible so "nearest" updates as the user moves.
        // Skip in Jest tests (expo-location is mocked without watchPositionAsync).
        if (process.env.NODE_ENV !== "test") {
          try {
            locationWatchRef.current?.remove();
            locationWatchRef.current = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                distanceInterval: 50,
                timeInterval: 15_000,
              },
              (pos) => {
                const c = pos?.coords;
                if (!c) return;
                setUserLocation({ lat: c.latitude, lng: c.longitude });
              },
            );
          } catch (e) {
            console.warn("[GPS] watchPositionAsync failed:", e);
          }
        }

        const locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setUserLocation({
          lat: locationData.coords.latitude,
          lng: locationData.coords.longitude,
        });
      } catch (e) {
        console.error("[GPS] Error getting location:", e);
        setGpsError("Unable to get location");
        Alert.alert(
          "Location Error",
          "Unable to get your current location. Please enable GPS and try again.",
        );
      }
    })();

    return () => {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, []);

  const userLat = userLocation?.lat ?? null;
  const userLng = userLocation?.lng ?? null;

  const cacheBasisRef = React.useRef<{
    lat: number;
    lng: number;
    at: number;
  } | null>(null);

  const refreshNeededRef = React.useRef(false);

  const CACHE_INVALIDATE_MOVED_METERS = 250;
  const CACHE_TTL_MS = 2 * 60_000;

  const invalidatePlaceCacheIfNeeded = () => {
    if (userLat === null || userLng === null) return;

    const now = Date.now();
    const basis = cacheBasisRef.current;
    if (!basis) {
      cacheBasisRef.current = { lat: userLat, lng: userLng, at: now };
      return;
    }

    const moved = haversineMeters(basis.lat, basis.lng, userLat, userLng);
    const stale = now - basis.at > CACHE_TTL_MS;

    if (moved > CACHE_INVALIDATE_MOVED_METERS || stale) {
      // Don't clear existing cached values immediately (keeps buttons snappy).
      // Instead, mark for background refresh.
      refreshNeededRef.current = true;
      cacheBasisRef.current = { lat: userLat, lng: userLng, at: now };
    }
  };

  const ensureNearestPlaceId = async (
    item: ServiceItem,
    opts?: { force?: boolean; includeSecondPage?: boolean },
  ) => {
    if (item.category !== "place") return null;
    const cached = placeCacheRef.current[item.id]?.placeId;
    if (!opts?.force && cached) return cached;

    if (placeInFlightRef.current[item.id]) {
      return await placeInFlightRef.current[item.id];
    }

    const promise = (async () => {
      const placeId = await getNearbyPlaces(
        userLat as number,
        userLng as number,
        item.searchKey || "",
        { includeSecondPage: opts?.includeSecondPage === true },
      );

      const prev = placeCacheRef.current[item.id] || {};
      placeCacheRef.current[item.id] = {
        ...prev,
        placeId,
        // If the place changes, the previously cached phone is no longer valid.
        phone: prev.placeId && prev.placeId !== placeId ? null : prev.phone,
      };
      return placeId;
    })()
      .catch((e) => {
        console.error("[Prefetch] getNearbyPlaces failed:", e);
        return null;
      })
      .finally(() => {
        delete placeInFlightRef.current[item.id];
      });

    placeInFlightRef.current[item.id] = promise;
    return await promise;
  };

  const ensurePlacePhone = async (
    item: ServiceItem,
    placeId: string,
    opts?: { force?: boolean },
  ) => {
    const cached = placeCacheRef.current[item.id]?.phone;
    if (!opts?.force && cached) return cached;

    const phoneKey = `${item.id}:${placeId}`;
    if (phoneInFlightRef.current[phoneKey]) {
      return await phoneInFlightRef.current[phoneKey];
    }

    const promise = (async () => {
      const phone = await getPlaceMobileNumber(placeId);
      placeCacheRef.current[item.id] = {
        ...(placeCacheRef.current[item.id] || {}),
        phone,
      };
      return phone;
    })()
      .catch((e) => {
        console.error("[Prefetch] getPlaceMobileNumber failed:", e);
        return null;
      })
      .finally(() => {
        delete phoneInFlightRef.current[phoneKey];
      });

    phoneInFlightRef.current[phoneKey] = promise;
    return await promise;
  };

  const refreshPlaceItem = (item: ServiceItem) => {
    if (item.category !== "place") return;
    if (userLat === null || userLng === null) return;
    if (!process.env.EXPO_PUBLIC_GOOGLE_API_KEY) return;

    // Quick refresh first (no page-2 wait) to keep UX smooth.
    void (async () => {
      try {
        const quickPlaceId = await ensureNearestPlaceId(item, {
          force: true,
          includeSecondPage: false,
        });
        if (!quickPlaceId) return;
        await ensurePlacePhone(item, quickPlaceId);

        // Background refinement (may take longer due to next_page_token delay).
        void (async () => {
          try {
            const refinedPlaceId = await ensureNearestPlaceId(item, {
              force: true,
              includeSecondPage: true,
            });
            if (!refinedPlaceId || refinedPlaceId === quickPlaceId) return;
            await ensurePlacePhone(item, refinedPlaceId, { force: true });
          } catch {
            // ignore
          }
        })();
      } catch {
        // ignore
      }
    })();
  };

  // Prefetch nearest Hospital/Police in the background once GPS is available.
  // This makes the UI feel instant in an emergency scenario.
  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    if (!process.env.EXPO_PUBLIC_GOOGLE_API_KEY) return;
    if (userLat === null || userLng === null) return;

    invalidatePlaceCacheIfNeeded();

    let cancelled = false;
    (async () => {
      const placeItems = SERVICES.filter((s) => s.category === "place");

      // If cache is missing or marked stale, refresh in the background.
      const shouldRefresh =
        refreshNeededRef.current ||
        placeItems.some((it) => !placeCacheRef.current[it.id]?.placeId);
      if (shouldRefresh) {
        refreshNeededRef.current = false;
        placeItems.forEach((it) => {
          if (cancelled) return;
          refreshPlaceItem(it);
        });
      }

      await Promise.allSettled(
        placeItems.map(async (item) => {
          const placeId = await ensureNearestPlaceId(item);
          if (cancelled || !placeId) return;
          await ensurePlacePhone(item, placeId);
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng]);

  // "Call" action:
  // - Hotlines: dial the known number
  // - Places (Hospital/Police): find nearest placeId -> fetch phone -> dial
  const handleCallAction = async (item: ServiceItem) => {
    if (item.category === "hotline") {
      setLoadingStatus({ id: item.id, type: "call" });
      try {
        await makePhoneCall(item.phone);
      } finally {
        setLoadingStatus(null);
      }
      return;
    }

    if (!process.env.EXPO_PUBLIC_GOOGLE_API_KEY) {
      Alert.alert(
        "Missing API key",
        "Set EXPO_PUBLIC_GOOGLE_API_KEY in your .env to enable Places search.",
      );
      return;
    }

    if (userLat === null || userLng === null) {
      Alert.alert(
        "Waiting for GPS",
        "Please wait until your location is available.",
      );
      return;
    }

    invalidatePlaceCacheIfNeeded();

    // Emergency UX: correctness > speed.
    // Always re-check the nearest place on tap to avoid using a cached (and possibly wrong)
    // placeId after GPS improvements (last-known -> high-accuracy) or subtle movements.
    const mustRefreshNearest = true;

    const cachedPlaceId = placeCacheRef.current[item.id]?.placeId || null;
    const cachedPhone = placeCacheRef.current[item.id]?.phone || null;
    const shouldShowLoading = true;

    console.log(
      `[Call] Starting search for ${item.name} at ${userLat}, ${userLng}`,
    );
    if (shouldShowLoading) setLoadingStatus({ id: item.id, type: "call" });
    try {
      const placeId = await ensureNearestPlaceId(item, {
        force: true,
        includeSecondPage: false,
      });
      console.log(`[Call] PlaceId result:`, placeId);
      if (!placeId) {
        Alert.alert("Not Found", `No nearby ${item.name} found.`);
        return;
      }

      const phoneNumber = await ensurePlacePhone(item, placeId, {
        force: true,
      });
      console.log(`[Call] Phone number:`, phoneNumber);
      if (phoneNumber) {
        await makePhoneCall(phoneNumber);
      } else {
        Alert.alert(
          "Not Available",
          "This location does not have a public number listed.",
        );
      }

      // If we moved enough to need refresh, don't block the call; refresh after.
      if (refreshNeededRef.current) refreshPlaceItem(item);
      // We just forced a refresh on tap; clear the flag so subsequent taps can use cache.
      if (mustRefreshNearest) refreshNeededRef.current = false;
    } catch (error) {
      console.error("[Call] Error:", error);
      Alert.alert("Error", "Check your internet connection.");
    } finally {
      if (shouldShowLoading) setLoadingStatus(null);
    }
  };

  // "Map" action:
  // - Finds nearest placeId
  // - Navigates to our Map tab and opens the selected-place sheet
  const handleMapAction = async (item: ServiceItem) => {
    if (item.category === "hotline") return;

    if (!process.env.EXPO_PUBLIC_GOOGLE_API_KEY) {
      Alert.alert(
        "Missing API key",
        "Set EXPO_PUBLIC_GOOGLE_API_KEY in your .env to enable Places search.",
      );
      return;
    }

    console.log(
      `[Map] Starting search for ${item.name} at ${userLat}, ${userLng}`,
    );

    // Check if we have valid coordinates
    if (
      userLat === null ||
      userLng === null ||
      isNaN(userLat) ||
      isNaN(userLng)
    ) {
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please enable GPS.",
      );
      return;
    }

    invalidatePlaceCacheIfNeeded();

    // Same as Call: correctness > speed.
    const mustRefreshNearest = true;

    const cachedPlaceId = placeCacheRef.current[item.id]?.placeId || null;
    const keyword = item.searchKey || item.name;

    // Fast path: if already cached, go straight to the place.
    if (cachedPlaceId && !mustRefreshNearest) {
      router.push({
        pathname: "/(tabs)/map",
        params: { placeId: cachedPlaceId, t: Date.now().toString() },
      });
      return;
    }

    // Slow-network UX: if placeId isn't ready quickly, navigate immediately to
    // the Map tab with a POI category so the user isn't stuck waiting.
    const placeIdPromise = ensureNearestPlaceId(item, {
      force: mustRefreshNearest,
      includeSecondPage: false,
    });
    const quick = await Promise.race([
      placeIdPromise.then((placeId) => ({ done: true as const, placeId })),
      delay(MAP_QUICK_NAV_MS).then(() => ({
        done: false as const,
        placeId: null,
      })),
    ]);

    if (!quick.done) {
      router.push({
        pathname: "/(tabs)/map",
        params: { poi: keyword, t: Date.now().toString() },
      });
      void (async () => {
        const placeId = await placeIdPromise;
        if (!placeId) return;
        router.replace({
          pathname: "/(tabs)/map",
          params: { placeId, t: Date.now().toString() },
        });

        if (mustRefreshNearest) refreshNeededRef.current = false;
      })();
      return;
    }

    // If we got a placeId quickly, keep the original behavior.
    const placeId = quick.placeId;
    if (!placeId) {
      Alert.alert(
        "Not Found",
        `Could not locate the nearest ${item.name} on the map. Please try again or check your internet connection.`,
      );
      return;
    }

    router.push({
      pathname: "/(tabs)/map",
      params: { placeId, t: Date.now().toString() },
    });

    if (mustRefreshNearest) refreshNeededRef.current = false;

    return;

    /*
      Previous implementation used loadingStatus + awaited getNearbyPlaces.
      The new approach makes the UI respond instantly on slow networks.
    */
  };

  // Platform-specific dialing. (iOS uses telprompt for a better UX.)
  const makePhoneCall = async (phoneNumber: string) => {
    const raw = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
    if (!raw) {
      Alert.alert("Not Available", "No phone number available.");
      return;
    }

    // Places often returns formatted numbers with spaces/parentheses.
    // `tel:` URIs are much more reliable with a sanitized number.
    const sanitized = raw.replace(/[^\d+]/g, "");
    if (!sanitized || sanitized === "+") {
      Alert.alert("Not Available", "Invalid phone number.");
      return;
    }

    const urls =
      Platform.OS === "ios"
        ? [`telprompt:${sanitized}`, `tel:${sanitized}`]
        : [`tel:${sanitized}`];

    let lastError: unknown = null;
    for (const url of urls) {
      try {
        // NOTE: canOpenURL is not always reliable on Android (package visibility),
        // so we call it for signal but we don't block dialing on it.
        try {
          await Linking.canOpenURL(url);
        } catch {
          // ignore
        }

        await Linking.openURL(url);
        return;
      } catch (e) {
        lastError = e;
      }
    }

    console.error("[Call] Failed to open dialer:", lastError);
    Alert.alert("Error", "Could not open phone dialer.");
  };

  // Renders a single service card.
  // For "place" cards, buttons are disabled until GPS is available.
  const renderCard = (item: ServiceItem, opts?: { marginBottom?: number }) => {
    const isCallDisabled =
      (loadingStatus?.id === item.id && loadingStatus?.type === "call") ||
      (item.category === "place" && userLat === null);

    const isMapDisabled =
      (loadingStatus?.id === item.id && loadingStatus?.type === "map") ||
      (item.category === "place" && userLat === null);

    return (
      <View
        key={item.id}
        className="rounded-3xl p-3"
        style={{
          width: "49%",
          backgroundColor: theme.card,
          borderColor: EMERGENCY_BORDER_COLOR,
          borderWidth: EMERGENCY_BORDER_WIDTH,
          marginBottom: opts?.marginBottom ?? 16,
        }}
      >
        <View className="flex-row justify-between items-center min-h-[90px]">
          <View className="flex-1 items-center justify-center pr-2">
            <Ionicons name={item.icon} size={32} color={EMERGENCY_ICON_COLOR} />
            <Text
              className="text-[12px] mt-2 text-center"
              style={{ color: theme.text, fontWeight: "600" }}
              numberOfLines={3}
            >
              {item.name}
            </Text>
          </View>

          <View className="flex-1 pl-2 space-y-2 justify-center">
            {/* Call Button */}
            <PopTouchableOpacity
              onPress={() => handleCallAction(item)}
              onPressIn={() => {
                if (item.category !== "place") return;
                if (!process.env.EXPO_PUBLIC_GOOGLE_API_KEY) return;
                if (userLat === null || userLng === null) return;

                // Start network work early (press-in) to reduce perceived latency.
                invalidatePlaceCacheIfNeeded();
                refreshPlaceItem(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} Call`}
              disabled={isCallDisabled}
              className="py-2 rounded-xl flex-row items-center justify-center"
              style={{
                backgroundColor: theme.background,
                borderColor: visibleBorderColor,
                borderWidth: visibleBorderWidth,
                opacity: isCallDisabled ? 0.6 : 1,
              }}
            >
              {loadingStatus?.id === item.id &&
              loadingStatus?.type === "call" ? (
                <ActivityIndicator size="small" color={EMERGENCY_ICON_COLOR} />
              ) : (
                <>
                  <Ionicons
                    name="call"
                    size={12}
                    color={EMERGENCY_ICON_COLOR}
                  />
                  <Text
                    className="text-[10px] ml-1 font-bold uppercase"
                    style={{ color: theme.text }}
                  >
                    Call
                  </Text>
                </>
              )}
            </PopTouchableOpacity>

            {/* Map Button */}
            {item.hasMap && (
              <PopTouchableOpacity
                onPress={() => handleMapAction(item)}
                onPressIn={() => {
                  if (item.category !== "place") return;
                  if (!process.env.EXPO_PUBLIC_GOOGLE_API_KEY) return;
                  if (userLat === null || userLng === null) return;

                  invalidatePlaceCacheIfNeeded();
                  refreshPlaceItem(item);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} Map`}
                disabled={isMapDisabled}
                className="py-2 rounded-xl flex-row items-center justify-center mt-3"
                style={{
                  backgroundColor: theme.card,
                  borderColor: visibleBorderColor,
                  borderWidth: visibleBorderWidth,
                  opacity: isMapDisabled ? 0.6 : 1,
                }}
              >
                {loadingStatus?.id === item.id &&
                loadingStatus?.type === "map" ? (
                  <ActivityIndicator
                    size="small"
                    color={EMERGENCY_ICON_COLOR}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="location"
                      size={12}
                      color={EMERGENCY_ICON_COLOR}
                    />
                    <Text
                      className="text-[10px] ml-1 font-bold uppercase"
                      style={{ color: theme.icon }}
                    >
                      Map
                    </Text>
                  </>
                )}
              </PopTouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <BackButton color={theme.text} accessibilityLabel="Back Button" />
        </View>

        <View className="mb-8">
          <Text
            className="text-[36px] leading-[42px]"
            style={{ color: theme.text, fontWeight: "700" }}
          >
            Emergency
          </Text>
          <Text
            className="text-[36px] leading-[42px]"
            style={{ color: theme.text, fontWeight: "700" }}
          >
            Services
          </Text>
          {!userLocation && (
            <Text className="text-xs mt-2 italic" style={{ color: theme.icon }}>
              {gpsError ? `GPS issue: ${gpsError}` : "Waiting for GPS..."}
            </Text>
          )}
        </View>

        <View className="mb-8">
          <Text
            className="text-[13px] uppercase mb-2"
            style={{
              color: theme.mode === "light" ? "#555" : "rgba(255,255,255,0.75)",
              fontWeight: "600",
              letterSpacing: 1.8,
            }}
          >
            Emergency Hotlines
          </Text>
          <View
            className="h-[1px] mb-4"
            style={{ backgroundColor: theme.border }}
          />
          <View className="flex-row flex-wrap justify-between">
            {SERVICES.filter((s) => s.category === "hotline").map(
              (item, index) =>
                renderCard(item, { marginBottom: index < 2 ? 24 : 16 }),
            )}
          </View>
        </View>

        <View className="mb-6">
          <Text
            className="text-[13px] uppercase mb-2"
            style={{
              color: theme.mode === "light" ? "#555" : "rgba(255,255,255,0.75)",
              fontWeight: "600",
              letterSpacing: 1.8,
            }}
          >
            Nearby safe places
          </Text>
          <View
            className="h-[1px] mb-4"
            style={{ backgroundColor: theme.border }}
          />
          <View className="flex-row flex-wrap justify-between">
            {SERVICES.filter((s) => s.category === "place").map((item) =>
              renderCard(item),
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
