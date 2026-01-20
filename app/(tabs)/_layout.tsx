import { Tabs } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Tabs initialRouteName="index">
      <Tabs.Screen
        name="extra"
        options={{
          title: "Extra",
          //tabBarShowLabel: false,
          headerShown: false,
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          //tabBarShowLabel: false,
          headerShown: false,
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          //tabBarShowLabel: false,
          headerShown: false,
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          //tabBarShowLabel: false,
          headerShown: false,
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          //tabBarShowLabel: false,
          headerShown: false,
        }}
      ></Tabs.Screen>
    </Tabs>
  );
}
