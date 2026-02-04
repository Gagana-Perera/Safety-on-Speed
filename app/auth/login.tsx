import { loginUser } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      alert("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      await loginUser(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error: any) {
      alert("Login failed: " + (error?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Top Row */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <Text style={styles.brand}>Safety on Speed</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Welcome, user.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>User Name</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.55)"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <View style={styles.underline} />

          <Text style={[styles.label, { marginTop: 30 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.55)"
            secureTextEntry
            style={styles.input}
          />
          <View style={styles.underline} />

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.signInBtn,
              pressed && { opacity: 0.85 },
              loading && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.signInText}>
              {loading ? "Signing in..." : "Sign in"}
            </Text>
          </Pressable>

          {/* Links */}
          <View style={styles.links}>
            <Text style={styles.linkText}>
              Don’t have an account?{" "}
              <Text
                style={styles.linkStrong}
                onPress={() => alert("Signup page not added yet")}
              >
                Sign up.
              </Text>
            </Text>

            <Text style={[styles.linkText, { marginTop: 10 }]}>
              Forgot Password ?{" "}
              <Text
                style={styles.linkStrong}
                onPress={() => alert("Forgot password page not added yet")}
              >
                Try another way
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#062A3A", // dark blue
    paddingHorizontal: 22,
    paddingTop: 44,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
  },
  brand: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 16,
    letterSpacing: 0.5,
  },

  header: {
    marginTop: 70,
    alignItems: "center",
  },
  title: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 56,
    fontWeight: "300",
  },
  subtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.7)",
    fontSize: 22,
    fontWeight: "300",
  },

  form: {
    marginTop: 70,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 30,
    fontWeight: "300",
    marginBottom: 16,
  },
  input: {
    color: "white",
    fontSize: 18,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  underline: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 2,
    marginTop: 6,
  },

  signInBtn: {
    marginTop: 46,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  signInText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 22,
    fontWeight: "300",
  },

  links: {
    marginTop: 34,
    alignItems: "center",
  },
  linkText: {
    color: "rgba(140, 210, 255, 0.85)",
    fontSize: 18,
  },
  linkStrong: {
    textDecorationLine: "underline",
    color: "rgba(140, 210, 255, 1)",
  },
});
