import AuthLayout, {
  AuthField,
  authStyles,
} from "@/components/auth/AuthLayout";
import { getSignupDraft, setSignupDraft } from "@/lib/signup-draft";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

export default function SignUpEmail() {
  const router = useRouter();
  const draft = getSignupDraft();
  const [email, setEmail] = useState(draft.email ?? "");

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
        next: "/auth/setup?flow=signup",
      },
    });
  }

  return (
    <AuthLayout
      eyebrow="Step 3 of 4"
      title="Add your email"
      subtitle="We use this to send your verification code and help you recover access later."
      showBack
      footer={
        <View style={authStyles.footerBlock}>
          <Text style={authStyles.supportingText}>
            We will send a one-time verification code to this address next.
          </Text>
        </View>
      }
    >
      <View style={authStyles.formGrid}>
        <AuthField
          value={email}
          onChangeText={setEmail}
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={handleFinish}
        />
        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [
            authStyles.primaryButton,
            pressed && authStyles.pressed,
          ]}
        >
          <Text style={authStyles.primaryButtonText}>Send Code</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
