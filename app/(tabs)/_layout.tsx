import { supabase } from "@/lib/superbase";
import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ImageBackground, View } from "react-native";
import { useTheme } from "../themeContext";

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
          <Image source={icon} className="size-12 mt-14 rounded-full" />
        ) : (
          <Image source={icon} className="size-12 mt-14" />
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
          <Image source={icon} className="size-12 mt-14 rounded-full" />
        ) : (
          <Image source={icon} className="size-12 mt-14" />
        )}
        {/* <Text className="pl-2 text-xl">{title}</Text> */}
      </ImageBackground>
    );
  }
};

export default function _layout() {
  // 2. Grab the theme
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarStyle: {
          // theme.card switches between Dark Blue (#1E3C5A) and White (#FFFFFF)
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
      }}
    >
      <Tabs.Screen name="backbutton" options={{ href: null }} />
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
