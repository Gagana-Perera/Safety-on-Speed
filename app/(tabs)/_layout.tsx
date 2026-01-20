import { Tabs } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Tabs initialRouteName="index">
      <Tabs.Screen
        name="extra"
        options={{
          title: "Extra",
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      ></Tabs.Screen>
    </Tabs>
  );
}
