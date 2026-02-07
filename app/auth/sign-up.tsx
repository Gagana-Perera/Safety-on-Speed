import { supabase } from "@/lib/superbase";
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

export default function SignUp() {
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (loading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !confirmPassword) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Weak password",
        "Please use at least 8 characters for your password."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }

      Alert.alert(
        "Check your email",
        "We sent a confirmation link. After confirming, sign in."
      );
      router.replace("/auth/login");
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
            <Text className="text-white text-6xl font-light">Sign up</Text>
            <Text className="text-white/80 text-2xl mt-4 font-light">
              Create your account.
            </Text>
          </View>

          {/* Inputs */}
          <View className="mt-16">
            <Text className="text-white/90 text-4xl font-light mb-4">
              Email
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
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
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

            <Text className="text-white/90 text-4xl font-light mb-4 mt-12">
              Confirm Password
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <View className="flex-row items-center">
                <TextInput
                  ref={confirmPasswordInputRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 text-white text-xl"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />

                <Pressable
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  className="px-2 py-2"
                >
                  <Text className="text-secondary text-lg">
                    {showConfirmPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>
          </View>

          {/* Bottom area */}
          <View className="flex-1 justify-end pb-24 mt-10">
            <Pressable
              onPress={handleSignUp}
              disabled={loading}
              className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
            >
              <Text className="text-white text-3xl font-light text-center">
                {loading ? "Creating..." : "Create account"}
              </Text>
            </Pressable>

            <View className="items-center mt-10">
              <Pressable
                onPress={() => router.push("/auth/login")}
                accessibilityRole="button"
              >
                <Text className="text-secondary text-xl">
                  Already have an account?{" "}
                  <Text className="underline text-accent">Sign in.</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
