import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";



export default function Index() {
  return (
  
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Welcome</Text>

      <Link href="/auth/sign-up" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Sign Up</Text>
      </Link>
      <Link href="/auth/login" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Login</Text>
      </Link>
    </View>
  );
}
