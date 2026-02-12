import { Tabs } from "expo-router";
import type { ComponentType } from "react";
import React from "react";
import type { ImageSourcePropType } from "react-native";
import { Image, View } from "react-native";
import type { SvgProps } from "react-native-svg";

import { icons } from "@/constants/icons";
import { officialdoc } from "@/constants/officialdoc";

type IconSource = ComponentType<SvgProps> | ImageSourcePropType;

type IconCProps = {
  focused: boolean;
  icon: IconSource;
  title?: string;
};

const IconC = ({ focused, icon }: IconCProps) => {
  const isSvg = typeof icon === "function";
  const isLogo = !isSvg && icon === officialdoc.logo;
  const size = isLogo ? 40 : 28;
  const SvgIcon = isSvg ? (icon as ComponentType<SvgProps>) : null;

  return (
    <View className="items-center justify-center">
      {SvgIcon ? (
        <SvgIcon width={size} height={size} opacity={focused ? 1 : 0.8} />
      ) : (
        <Image
          source={icon as ImageSourcePropType}
          style={{ width: size, height: size, opacity: focused ? 1 : 0.8 }}
        />
      )}
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
        },
      }}
    >
      <Tabs.Screen
        name="extra"
        options={{
          title: "Extra",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ focused }) => (
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
          tabBarIcon: ({ focused }) => (
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
          tabBarIcon: ({ focused }) => (
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
          tabBarIcon: ({ focused }) => (
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
          tabBarIcon: ({ focused }) => (
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
