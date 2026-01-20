import { Tabs } from "expo-router";
import React from "react";

const Start = ({ route, preventDefault }) => {
  if (UserActivation) {
    if (route.key === "extra") {
      preventDefault();
      return (
        <Tabs>
          <Tabs.Screen name="index" />
        </Tabs>
      );
    }
  }
};

export default function _layout() {
  return (
    <Tabs>
      <Start />
      <Tabs.Screen
        name="extra"
        options={{
          title: "Extra",
        }}
        // listeners={() => {
        //   (e) => {
        //     tDefault();
        //     navigate("/map");
        //     // navigation.navigate('Home');
        //   };
        // }}
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
