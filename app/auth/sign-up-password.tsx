import { setSignupDraft } from "@/lib/signup-draft";
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

export default function SignUpPassword() {
  const router = useRouter();
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleNext() {
    if (!password || !confirmPassword) {
      Alert.alert("Missing info", "Please fill in all details.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }

    setSignupDraft({
      password: password,
    });

    router.push("/auth/sign-up-email");
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
          {/* Header */}
          <View className="flex-row items-center mb-8">
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-4 py-2"
            >
              <Text className="text-white text-xl mr-2">{"<"}</Text>
              <Text className="text-white text-xl font-light">Back</Text>
            </Pressable>
          </View>

          {/* Title */}
          <View className="items-center mb-10">
            <Text className="text-white text-6xl font-light tracking-wider">
              Sign up
            </Text>
          </View>

          {/* Password */}
          <View className="mt-8">
            <Text className="text-white text-2xl font-light mb-2">
              Password
            </Text>
            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <View className="flex-row items-center">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  className="flex-1 text-white text-lg"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() =>
                    confirmPasswordInputRef.current?.focus()
                  }
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
              <View className="h-[2px] bg-white/30 rounded-full mt-2" />
            </View>
          </View>

          {/* Confirm Password */}
          <View className="mt-8">
            <Text className="text-white text-2xl font-light mb-2">
              Confirm Password
            </Text>
            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <View className="flex-row items-center">
                <TextInput
                  ref={confirmPasswordInputRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  className="flex-1 text-white text-lg"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
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
              <View className="h-[2px] bg-white/30 rounded-full mt-2" />
            </View>
          </View>

          {/* Bottom */}
          <View className="flex-1 justify-end pb-10 mt-10">
            <Pressable
              onPress={handleNext}
              className="self-center bg-black/40 border border-white/10 rounded-2xl px-12 py-3"
            >
              <Text className="text-white text-2xl font-light">Next</Text>
            </Pressable>
            <View className="h-[1px] bg-white/20 w-3/4 self-center mt-12 mb-8" />

            {/* Pagination Dots */}
            <View className="flex-row justify-center space-x-8 items-center">
              <View className="w-4 h-4 rounded-full bg-white/90" />
              <View className="w-4 h-4 rounded-full bg-white/90" />
              <View className="w-4 h-4 rounded-full bg-white/40" />
            </View>

            <View className="items-center mt-8">
              <Pressable
                onPress={() => router.push("/auth/login")}
                accessibilityRole="button"
              >
                <Text className="text-secondary text-lg">
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
