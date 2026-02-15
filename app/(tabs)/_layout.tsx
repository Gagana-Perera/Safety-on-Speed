import { Tabs } from "expo-router";
import React from "react";
import { Image, ImageBackground } from "react-native";

import { icons } from "@/constants/icons";
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
              className="size-12 mt-14 rounded-full"
          />) : (
            <Image 
              source={icon} 
              className="size-12 mt-14"
          />
          )}
        {/* <Text className="pl-2 text-xs">{title}</Text> */}
        
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
              className="size-12 mt-14 rounded-full"
          />) : (
            <Image 
              source={icon} 
              className="size-12 mt-14"
          />
          )}
        {/* <Text className="pl-2 text-xl">{title}</Text> */}
        
      </ImageBackground>
    );
  }
};

export default function _layout() {
  return (
    <Tabs 
      initialRouteName="index"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#002747"
        }
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
              icon={icons.home}
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