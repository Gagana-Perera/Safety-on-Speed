import { loginUser } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
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
        error?.message ?? "Something went wrong. Please try again."
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
        <View className="flex-1 px-6 pt-14">
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-5 py-3 self-start"
          >
            <Text className="text-white text-2xl mr-3">←</Text>
            <Text className="text-white/80 text-3xl font-light">Back</Text>
          </Pressable>

            {/* Title */}
            <View className="mt-20 items-center">
              <Text className="text-white text-6xl font-light">Sign in</Text>
              <Text className="text-white/70 text-2xl mt-4 font-light">
                Welcome, user.
              </Text>
            </View>

            {/* Inputs */}
            <View className="mt-20">
              <Text className="text-white/90 text-4xl font-light mb-5">
                Email
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.6)"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                className="text-white text-lg px-2 py-2"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              <View className="h-[3px] bg-white/40 rounded-full mt-2" />

              <Text className="text-white/90 text-4xl font-light mb-5 mt-16">
                Password
              </Text>

              {/* Password row: input + show/hide */}
              <View className="flex-row items-center">
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white text-lg px-2 py-2"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />

                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  className="px-3 py-2"
                >
                  <Text className="text-secondary text-lg underline">
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>

              <View className="h-[3px] bg-white/40 rounded-full mt-2" />
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
                    <Text className="underline text-accent">
                      Try another way
                    </Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}
