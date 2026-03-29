import { isSupabaseConfigured, supabase } from "@/lib/superbase";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function SessionGate() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function checkSession() {
      if (!isSupabaseConfigured) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      const { error: refreshError, data: refreshedData } =
        await supabase.auth.refreshSession();
      const activeSession = refreshedData.session ?? session;

      if (refreshError || !activeSession?.access_token) {
        await supabase.auth.signOut().catch(() => undefined);
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(activeSession.access_token);

      if (userError || !user) {
        await supabase.auth.signOut().catch(() => undefined);
        setLoggedIn(false);
      } else {
        setLoggedIn(true);
      }

      setLoading(false);
    }

    void checkSession();
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
