import { supabase } from "@/lib/superbase";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function SessionGate() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setLoggedIn(true);
        //TRUE
      } else {
        setLoggedIn(false);
        //FALSE
      }

      setLoading(false);
    }

    checkSession();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return loggedIn ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/auth/login" />
  );
}
