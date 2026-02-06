import { loginUser } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Login() {
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁️ show/hide
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginUser(trimmedEmail, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Login failed",
        error?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 px-6 pt-12">
          {/* Brand */}
          <View className="items-center">
            <Image
              source={require("../../assets/oc/logo.jpg")}
              resizeMode="contain"
              className="h-24 w-24 mb-4 opacity-80"
            />
            <Text className="text-white/70 text-xl tracking-[4px]">
              Safety On Speed
            </Text>
          </View>

          {/* Title */}
          <View className="mt-14 items-center">
            <Text className="text-white text-6xl font-light">Sign in</Text>
            <Text className="text-white/80 text-2xl mt-4 font-light">
              Welcome, user.
            </Text>
          </View>

          {/* Inputs */}
          <View className="mt-16">
            <Text className="text-white/90 text-4xl font-light mb-4">
              User Name
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                className="text-white text-xl"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>

            <Text className="text-white/90 text-4xl font-light mb-4 mt-12">
              Password
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <View className="flex-row items-center">
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white text-xl"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />

                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  className="px-2 py-2"
                >
                  <Text className="text-secondary text-lg">
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>
          </View>

          {/* Bottom area */}
          <View className="flex-1 justify-end pb-24">
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
            >
              <Text className="text-white text-3xl font-light text-center">
                {loading ? "Signing in..." : "Sign in"}
              </Text>
            </Pressable>

            <View className="items-center mt-10">
              <Text className="text-secondary text-xl">
                Don’t have an account?{" "}
                <Text className="underline text-accent">Sign up.</Text>
              </Text>

              <Pressable
                onPress={() => router.push("/auth/forgot-password")}
                accessibilityRole="button"
              >
                <Text className="text-secondary text-xl mt-5">
                  Forgot Password ?{" "}
                  <Text className="underline text-accent">Try another way</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
