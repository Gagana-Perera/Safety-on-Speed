import { setSignupDraft } from "@/lib/signup-draft";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

export default function SignUpEmail() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleFinish() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Missing info", "Please enter your email.");
      return;
    }

    setSignupDraft({
      email: trimmedEmail,
    });

    // Per user design flow: "Finish" -> OTP Verification
    router.push({
      pathname: "/auth/otp",
      params: {
        // After OTP verification during signup, take the user to guardian setup.
        // (Other OTP entry points can omit this and will default to /(tabs).)
        next: "/auth/setup",
      },
    });
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
          <View className="mt-8">
            <Text className="text-white text-6xl font-light tracking-wide leading-tight">
              Almost{"\n"}there!
            </Text>
            <Text className="text-white/80 text-xl mt-6 leading-7">
              To keep you posted on new updates and as a recovery option when
              resetting password please enter you Email.
            </Text>
          </View>

          {/* Inputs */}
          <View className="mt-12">
            <Text className="text-white text-2xl font-light mb-2">E-mail</Text>
            <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="text-white text-lg"
                returnKeyType="done"
                onSubmitEditing={handleFinish}
              />
            </View>
            <View className="h-[2px] bg-white/30 rounded-full mt-2 mx-2" />
          </View>

          {/* Finish Button */}
          <View className="flex-1 justify-end pb-24 mt-10">
            <Pressable
              onPress={handleFinish}
              className="self-center bg-black/40 border border-white/10 rounded-2xl px-16 py-3"
            >
              <Text className="text-white text-2xl font-light">Finish</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
