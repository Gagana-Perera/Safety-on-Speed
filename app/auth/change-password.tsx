import { supabase } from "@/lib/superbase";
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

export default function ChangePassword() {
  const router = useRouter();
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
    if (loading) return;

    if (!newPassword || !confirmPassword) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert(
        "Password updated",
        "Your password has been changed successfully.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert(
        "Failed to update",
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
          <View className="mt-8 mb-12">
            <Text className="text-white text-6xl font-light">
              Change{"\n"}Password
            </Text>
            <Text className="text-white/70 text-xl mt-4 font-light leading-7">
              Choose a strong password with at least 8 characters.
            </Text>
          </View>

          {/* New Password */}
          <View className="mt-4">
            <Text className="text-white/90 text-2xl font-light mb-2">
              New Password
            </Text>
            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <View className="flex-row items-center">
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  className="flex-1 text-white text-xl"
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
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>
          </View>

          {/* Confirm Password */}
          <View className="mt-8">
            <Text className="text-white/90 text-2xl font-light mb-2">
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
                  className="flex-1 text-white text-xl"
                  returnKeyType="done"
                  onSubmitEditing={handleChangePassword}
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

          {/* Submit */}
          <View className="flex-1 justify-end pb-24 mt-10">
            <Pressable
              onPress={handleChangePassword}
              disabled={loading}
              className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
            >
              <Text className="text-white text-3xl font-light text-center">
                {loading ? "Updating..." : "Change Password"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
