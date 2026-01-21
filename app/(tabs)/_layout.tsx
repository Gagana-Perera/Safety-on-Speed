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
        if (title == Home) {
          <Image 
          source={icon} 
          className="size-12 rounded-full mt-10" 
        />
        } else {
          <Image 
          source={icon} 
          className="size-12" 
          />
        }
        <Text className="">{title}</Text>
      </ImageBackground>
    );
  } 
  // else if (focused && title == "Home") {
  //   return (
  //     <ImageBackground
  //       //source={}
  //       className=""
  //     >
  //       <Image 
  //         source={icon} 
  //         className="size-12 " 
  //       />
  //       <Text className="">{title}</Text>
  //     </ImageBackground>
  //   )
  // } 
  else {
    return (
      <ImageBackground
        //source={}
        className=""
      >
        <Image source={icon} className="" />
        <Text className="">{title}</Text>
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
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <IconC 
              focused={focused} 
              icon={officialdoc.logo}
              title="Home"/>
          ),
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
