import { Tabs } from "expo-router";
import React from "react";
import { Image, View } from "react-native";

import { icons } from "@/constants/icons";
import { officialdoc } from "@/constants/officialdoc";

const IconC = ({ focused, icon, title }: any) => {
  // SVGs imported via transformer are functions/components
  if (typeof icon === "function") {
    const IconComponent = icon;
    return (
      <View className="items-center justify-center">
        <IconComponent
          width={28}
          height={28}
          fill={focused ? "#A4E4FF" : "#FFFFFF"}
        />
      </View>
    );
  }

  return (
    <View className="items-center justify-center">
      <Image
        source={icon}
        className={
          icon === officialdoc.logo ? "size-10 rounded-full" : "size-7"
        }
        style={{ opacity: focused ? 1 : 0.8 }}
      />
    </View>
  );
};

export default function _layout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#002747",
          borderTopWidth: 0,
          height: 60,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#A4E4FF",
        tabBarInactiveTintColor: "#FFFFFF",
      }}
    >
      <Tabs.Screen
        name="extra"
        options={{
          title: "Extra",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <IconC
              focused={focused}
              icon={icons.home}
              //title= "Extra"
            />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <IconC
              focused={focused}
              icon={icons.menu}
              //title= "Map"
            />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <IconC focused={focused} icon={officialdoc.logo} />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <IconC
              focused={focused}
              icon={icons.forum}
              //title= "News"
            />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <IconC
              focused={focused}
              icon={icons.person}
              //title= "Profile"
            />
          ),
        }}
      ></Tabs.Screen>
    </Tabs>
  );
}
