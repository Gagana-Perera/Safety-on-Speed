import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location"; // Added for nationwide GPS
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

// Import the background logic from your service file
import {
  getNearbyPlaces,
  getPlaceMobileNumber,
} from "../../services/GooglePlacesService";

// 1. Define the interface for our emergency services
interface ServiceItem {
  id: string;
  name: string;
  phone: string;
  icon: keyof typeof Ionicons.glyphMap;
  hasMap: boolean;
  category: "hotline" | "place";
  searchKey?: string;
}

// 2. Define the services data
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
    searchKey: "police",
  },
];

export default function EmergencyServices() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 3. EFFECT: Get user location on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Access Denied",
          "We need your location to find the nearest emergency services.",
        );
        return;
      }

      let locationData = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: locationData.coords.latitude,
        lng: locationData.coords.longitude,
      });
    })();
  }, []);

  // Use dynamic coordinates, fallback to Colombo (6.9271, 79.8612) if GPS not ready
  const userLat = userLocation?.lat || 6.9271;
  const userLng = userLocation?.lng || 79.8612;

  // Function to handle the Call Button
  const handleCallAction = async (item: ServiceItem) => {
    if (item.category === "hotline") {
      makePhoneCall(item.phone);
      return;
    }

    setLoadingId(item.id);
    try {
      const placeId = await getNearbyPlaces(
        userLat,
        userLng,
        item.searchKey || "",
      );

      if (!placeId) {
        Alert.alert(
          "Not Found",
          `No nearby ${item.name} found in your current area.`,
        );
        return;
      }

      const phoneNumber = await getPlaceMobileNumber(placeId);

      if (phoneNumber) {
        makePhoneCall(phoneNumber);
      } else {
        Alert.alert(
          "Not Available",
          "This location does not have a public number listed in Google Maps.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Service Error",
        "Could not connect to emergency services. Please check your internet connection.",
      );
    } finally {
      setLoadingId(null);
    }
  };

  // Function to handle Map redirection
  const handleMapAction = (item: ServiceItem) => {
    const scheme = Platform.select({
      ios: "maps:0,0?q=",
      android: "geo:0,0?q=",
    });
    const latLng = `${userLat},${userLng}`;
    const label = `Nearest ${item.name}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) Linking.openURL(url);
  };

  const makePhoneCall = (phoneNumber: string) => {
    const url =
      Platform.OS === "ios" ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Device does not support phone calls.");
      }
    });
  };

  const renderCard = (item: ServiceItem) => (
    <View
      key={item.id}
      className="w-[48%] bg-[#1A3B54]/70 rounded-3xl p-3 mb-4 border border-white/10"
    >
      <View className="flex-row justify-between items-center min-h-[90px]">
        <View className="flex-1 items-center justify-center border-r border-white/10 pr-2">
          <Ionicons name={item.icon} size={32} color="#8FD3FF" />
          <Text
            className="text-white text-[10px] mt-2 text-center font-bold"
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>

        <View className="flex-1 pl-2 space-y-2 justify-center">
          <TouchableOpacity
            onPress={() => handleCallAction(item)}
            disabled={loadingId === item.id}
            className="bg-[#0B253A] py-2 rounded-xl flex-row items-center justify-center border border-blue-400/20"
          >
            {loadingId === item.id ? (
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

          {item.hasMap && (
            <TouchableOpacity
              onPress={() => handleMapAction(item)}
              className="bg-[#0B253A]/50 border border-[#2E6E9E] py-2 rounded-xl flex-row items-center justify-center mt-1"
            >
              <Ionicons name="location" size={12} color="#8FD3FF" />
              <Text className="text-[#8FD3FF] text-[10px] ml-1 uppercase">
                Map
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#031B2E]">
      <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
        <TouchableOpacity className="flex-row items-center mb-6 bg-[#0B253A]/80 self-start px-4 py-2 rounded-2xl border border-white/5">
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
          <Text className="text-[#8FD3FF]/80 text-lg mt-2">
            Quick Access to Nearby Help
          </Text>
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
