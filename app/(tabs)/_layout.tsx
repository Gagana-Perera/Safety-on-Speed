import { supabase } from "@/lib/superbase";
import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { useTheme } from "../themeContext";

import { icons } from "@/constants/icons";
import { officialdoc } from "@/constants/officialdoc";

const IconC = ({
  icon,
  color,
  size,
}: {
  icon: any;
  color: string;
  size: number;
}) => {
  // `constants/icons.ts` exports SVGs as React components.
  // The home logo is a normal image source.
  if (icon === officialdoc.logo) {
    return (
      <Image
        source={icon}
        style={{
          width: size + 10,
          height: size + 10,
          borderRadius: (size + 10) / 2,
        }}
        resizeMode="cover"
      />
    );
  }

  const SvgIcon = icon as React.ComponentType<{
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
  }>;
  return (
    <SvgIcon width={size + 6} height={size + 6} fill={color} stroke={color} />
  );
};

export default function TabsLayout() {
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
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.icon,
        tabBarStyle: {
          // theme.card switches between Dark Blue (#1E3C5A) and White (#FFFFFF)
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 72,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
      }}
    >
      <Tabs.Screen
        name="extra"
        options={{
          title: "Extra",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <IconC icon={icons.home} color={color} size={size} />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <IconC icon={icons.home} color={color} size={size} />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <IconC icon={officialdoc.logo} color={color} size={size} />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <IconC icon={icons.forum} color={color} size={size} />
          ),
        }}
      ></Tabs.Screen>
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarShowLabel: false,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <IconC icon={icons.person} color={color} size={size} />
          ),
        }}
      ></Tabs.Screen>
    </Tabs>
  );
}
