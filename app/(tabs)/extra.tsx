import { Ionicons } from "@expo/vector-icons";
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
    searchKey: "police station",
  },
];

export default function EmergencyServices() {
  const router = useRouter();

  // NEW: Object state to track which specific button is loading
  const [loadingStatus, setLoadingStatus] = useState<{
    id: string;
    type: "call" | "map";
  } | null>(null);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "GPS is required to find help near you.",
        );
        return;
      }

      let locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setUserLocation({
        lat: locationData.coords.latitude,
        lng: locationData.coords.longitude,
      });
    })();
  }, []);

  const userLat = userLocation?.lat || 6.9271;
  const userLng = userLocation?.lng || 79.8612;

  const handleCallAction = async (item: ServiceItem) => {
    if (item.category === "hotline") {
      makePhoneCall(item.phone);
      return;
    }

    setLoadingStatus({ id: item.id, type: "call" }); // Specifically set 'call' loading
    try {
      const placeId = await getNearbyPlaces(
        userLat,
        userLng,
        item.searchKey || "",
      );
      if (!placeId) {
        Alert.alert("Not Found", `No nearby ${item.name} found.`);
        return;
      }

      const phoneNumber = await getPlaceMobileNumber(placeId);
      if (phoneNumber) {
        makePhoneCall(phoneNumber);
      } else {
        Alert.alert(
          "Not Available",
          "This location does not have a public number listed.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Check your internet connection.");
    } finally {
      setLoadingStatus(null);
    }
  };

  const handleMapAction = async (item: ServiceItem) => {
    if (item.category === "hotline") return;

    setLoadingStatus({ id: item.id, type: "map" }); // Specifically set 'map' loading
    try {
      const placeId = await getNearbyPlaces(
        userLat,
        userLng,
        item.searchKey || "",
      );

      if (placeId) {
        // Open inside our app Map tab and load details for this placeId.
        router.push({
          pathname: "/(tabs)/map",
          params: { placeId },
        });
      } else {
        Alert.alert(
          "Error",
          `Could not locate the nearest ${item.name} on the map.`,
        );
      }
    } catch (error) {
      Alert.alert("Error", "Could not open in-app map.");
    } finally {
      setLoadingStatus(null);
    }
  };

  const makePhoneCall = (phoneNumber: string) => {
    const url =
      Platform.OS === "ios" ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert("Error", "Device does not support phone calls.");
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
          {/* Call Button */}
          <TouchableOpacity
            onPress={() => handleCallAction(item)}
            disabled={loadingStatus?.id === item.id}
            className="bg-[#0B253A] py-2 rounded-xl flex-row items-center justify-center border border-blue-400/20"
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
              disabled={loadingStatus?.id === item.id}
              className="bg-[#0B253A]/50 border border-[#2E6E9E] py-2 rounded-xl flex-row items-center justify-center mt-1"
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
          {!userLocation && (
            <Text className="text-orange-400 text-xs mt-2 italic">
              Waiting for GPS...
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
