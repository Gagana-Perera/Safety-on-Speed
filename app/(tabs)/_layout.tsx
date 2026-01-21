import { Tabs } from "expo-router";
import React from "react";
import { Image, ImageBackground, Text } from "react-native";

import { officialdoc } from "@/constants/officialdoc";

const IconC = ({ focused, icon, title }: any) => {
  if (focused) {
    return (
      <ImageBackground
        //source={}
        className=""
      >
        {icon === officialdoc.logo ? ( 
          <Image 
              source={icon} 
              className="size-12 mt-10 rounded-full"
          />) : (
            <Image 
              source={icon} 
              className="size-12 mt-14"
          />
          )}
        <Text className="pl-2">{title}</Text>
        
      </ImageBackground>
    );
  } else {
    return (
      <ImageBackground
        //source={}
        className=""
      >
        {icon === officialdoc.logo ? ( 
          <Image 
              source={icon} 
              className="size-12 mt-10 rounded-full"
          />) : (
            <Image 
              source={icon} 
              className="size-12 mt-14"
          />
          )}
        <Text className="pl-2">{title}</Text>
        
      </ImageBackground>
    );
  }
};

export default function _layout() {
  return (
    <Tabs initialRouteName="index">
      <Tabs.Screen
        name="extra"
        options={{
          title: "Extra",
          tabBarShowLabel: false,
          headerShown: false,
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
              icon={officialdoc.logo}
              title= "Map" />
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
            <IconC 
              focused={focused} 
              icon={officialdoc.logo}/>
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarShowLabel: false,
          headerShown: false,
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarShowLabel: false,
          headerShown: false,
        }}
      ></Tabs.Screen>
    </Tabs>
  );
}
