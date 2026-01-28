/*import React from "react";
import { Text, View } from "react-native";

export default function Extra() {
  return (
    <View>
      <Text>Extra</Text>
    </View>
  );
}
*/

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 1. Define the interface for our emergency services
interface ServiceItem {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  hasMap: boolean;
  category: "hotline" | "place";
}

const SERVICES: ServiceItem[] = [
  {
    id: "1",
    name: "119",
    icon: "shield-checkmark-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "2",
    name: "Ambulance service",
    icon: "car-sport-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "3",
    name: "Fire & Rescue",
    icon: "flame-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "4",
    name: "Women & Child Bureau",
    icon: "heart-outline",
    hasMap: false,
    category: "hotline",
  },
  {
    id: "5",
    name: "Hospital",
    icon: "add-circle-outline",
    hasMap: true,
    category: "place",
  },
  {
    id: "6",
    name: "Police Station",
    icon: "shield-outline",
    hasMap: true,
    category: "place",
  },
];

export default function EmergencyServices() {
  const renderCard = (item: ServiceItem) => (
    <View
      key={item.id}
      className="w-[48%] bg-[#1A3B54]/70 rounded-3xl p-3 mb-4 border border-white/10"
    >
      <View className="flex-row justify-between items-center min-h-[90px]">
        {/* Left Section: Icon & Name */}
        <View className="flex-1 items-center justify-center border-r border-white/10 pr-2">
          <Ionicons name={item.icon} size={32} color="#8FD3FF" />
          <Text
            className="text-white text-[10px] mt-2 text-center font-bold"
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>

        {/* Right Section: Buttons */}
        <View className="flex-1 pl-2 space-y-2 justify-center">
          <TouchableOpacity className="bg-[#0B253A] py-2 rounded-xl flex-row items-center justify-center border border-blue-400/20">
            <Ionicons name="call" size={12} color="white" />
            <Text className="text-white text-[10px] ml-1 font-bold uppercase">
              Call
            </Text>
          </TouchableOpacity>

          {item.hasMap && (
            <TouchableOpacity className="bg-[#0B253A]/50 border border-[#2E6E9E] py-2 rounded-xl flex-row items-center justify-center mt-1">
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
        {/* Header Section */}
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

        {/* Section: Hotlines */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">
            Emergency Hotlines
          </Text>
          <View className="h-[1px] bg-white/10 mb-4" />
          <View className="flex-row flex-wrap justify-between">
            {SERVICES.filter((s) => s.category === "hotline").map(renderCard)}
          </View>
        </View>

        {/* Section: Safe Places */}
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
