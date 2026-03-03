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
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../themeContext";

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
    searchKey: "hospital",
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

export default function EmergencyServices() {
  const router = useRouter();
  const { theme } = useTheme();

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
  }, []);

  const userLat = userLocation?.lat ?? null;
  const userLng = userLocation?.lng ?? null;

  // "Call" action:
  // - Hotlines: dial the known number
  // - Places (Hospital/Police): find nearest placeId -> fetch phone -> dial
  const handleCallAction = async (item: ServiceItem) => {
    if (item.category === "hotline") {
      makePhoneCall(item.phone);
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

    console.log(
      `[Call] Starting search for ${item.name} at ${userLat}, ${userLng}`,
    );
    setLoadingStatus({ id: item.id, type: "call" });
    try {
      const placeId = await getNearbyPlaces(
        userLat,
        userLng,
        item.searchKey || "",
      );
      console.log(`[Call] PlaceId result:`, placeId);
      if (!placeId) {
        Alert.alert("Not Found", `No nearby ${item.name} found.`);
        return;
      }

      const phoneNumber = await getPlaceMobileNumber(placeId);
      console.log(`[Call] Phone number:`, phoneNumber);
      if (phoneNumber) {
        makePhoneCall(phoneNumber);
      } else {
        Alert.alert(
          "Not Available",
          "This location does not have a public number listed.",
        );
      }
    } catch (error) {
      console.error("[Call] Error:", error);
      Alert.alert("Error", "Check your internet connection.");
    } finally {
      setLoadingStatus(null);
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

    setLoadingStatus({ id: item.id, type: "map" });
    try {
      const placeId = await getNearbyPlaces(
        userLat,
        userLng,
        item.searchKey || "",
      );
      console.log(`[Map] PlaceId result:`, placeId);

      if (placeId) {
        // Open inside our app Map tab and load details for this placeId.
        console.log(`[Map] Navigating to map with placeId:`, placeId);
        router.push({
          pathname: "/(tabs)/map",
          params: { placeId, t: Date.now().toString() },
        });
      } else {
        Alert.alert(
          "Not Found",
          `Could not locate the nearest ${item.name} on the map. Please try again or check your internet connection.`,
        );
      }
    } catch (error) {
      console.error("[Map] Error:", error);
      Alert.alert(
        "Error",
        `Could not open in-app map: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoadingStatus(null);
    }
  };

  // Platform-specific dialing. (iOS uses telprompt for a better UX.)
  const makePhoneCall = (phoneNumber: string) => {
    const url =
      Platform.OS === "ios" ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert("Error", "Device does not support phone calls.");
    });
  };

  // Renders a single service card.
  // For "place" cards, buttons are disabled until GPS is available.
  const renderCard = (item: ServiceItem) => (
    <View
      key={item.id}
      className="w-[48%] bg-[#1A3B54]/70 rounded-3xl p-3 mb-4 border border-white/10"
    >
      <View className="flex-row justify-between items-center min-h-[90px]">
        <View className="flex-1 items-center justify-center pr-2">
          <Ionicons name={item.icon} size={32} color="#8FD3FF" />
          <Text
            className="text-white text-[10px] mt-2 text-center font-bold"
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>

        <View className="flex-1 pl-2 space-y-2 justify-center">
          {/* Call Button */}
          <TouchableOpacity
            onPress={() => handleCallAction(item)}
            disabled={
              (loadingStatus?.id === item.id &&
                loadingStatus?.type === "call") ||
              (item.category === "place" && userLat === null)
            }
            className="bg-[#0B253A] py-2 rounded-xl flex-row items-center justify-center border border-[#8FD3FF]/40"
          >
            {loadingStatus?.id === item.id && loadingStatus?.type === "call" ? (
              <ActivityIndicator size="small" color="#8FD3FF" />
            ) : (
              <>
                <Ionicons name="call" size={12} color="white" />
                <Text className="text-white text-[10px] ml-1 font-bold uppercase">
                  Call
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Map Button */}
          {item.hasMap && (
            <TouchableOpacity
              onPress={() => handleMapAction(item)}
              disabled={
                (loadingStatus?.id === item.id &&
                  loadingStatus?.type === "map") ||
                (item.category === "place" && userLat === null)
              }
              className="bg-[#0B253A]/50 border border-[#8FD3FF]/40 py-2 rounded-xl flex-row items-center justify-center mt-1"
            >
              {loadingStatus?.id === item.id &&
              loadingStatus?.type === "map" ? (
                <ActivityIndicator size="small" color="#8FD3FF" />
              ) : (
                <>
                  <Ionicons name="location" size={12} color="#8FD3FF" />
                  <Text className="text-[#8FD3FF] text-[10px] ml-1 uppercase">
                    Map
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-6 bg-[#0B253A]/80 self-start px-4 py-2 rounded-2xl border border-[#8FD3FF]/30"
        >
          <Ionicons name="chevron-back" size={20} color="#8FD3FF" />
          <Text className="text-[#8FD3FF] text-lg font-medium ml-1">Back</Text>
        </TouchableOpacity>

        <View className="mb-8">
          <Text className="text-white text-5xl font-bold leading-tight">
            Emergency
          </Text>
          <Text className="text-white text-5xl font-bold leading-tight">
            Services
          </Text>
          {!userLocation && (
            <Text className="text-orange-400 text-xs mt-2 italic">
              {gpsError ? `GPS issue: ${gpsError}` : "Waiting for GPS..."}
            </Text>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">
            Emergency Hotlines
          </Text>
          <View className="h-[1px] bg-white/10 mb-4" />
          <View className="flex-row flex-wrap justify-between">
            {SERVICES.filter((s) => s.category === "hotline").map(renderCard)}
          </View>
        </View>

        <View className="mb-10">
          <Text className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">
            Nearby safe places
          </Text>
          <View className="h-[1px] bg-white/10 mb-4" />
          <View className="flex-row flex-wrap justify-between">
            {SERVICES.filter((s) => s.category === "place").map(renderCard)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
