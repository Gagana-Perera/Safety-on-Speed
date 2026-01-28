import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/superbase";

export default function SessionGate() {
    const [loading, setLoading] = useState(true);
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        async function checkSession() {
            const { data } = await supabase.auth.getSession();
            setLoggedIn(!!data.session);
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

    return loggedIn ? <Redirect href="/(tabs)" /> : <Redirect href="/auth/login" />;
}
