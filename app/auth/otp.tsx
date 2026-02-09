import { clearSignupDraft, getSignupDraft } from "@/lib/signup-draft";
import { supabase } from "@/lib/superbase";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const OTP_LENGTH = 6;

export default function SignUpOtp() {
  const router = useRouter();
  const otpInputRef = useRef<TextInput>(null);

  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const draft = getSignupDraft();

  useEffect(() => {
    if (
      !draft.fullName ||
      !draft.nickName ||
      !draft.birthdate ||
      !draft.phoneNumber ||
      !draft.email ||
      !draft.password ||
      !draft.guardians ||
      draft.guardians.length < 2
    ) {
      Alert.alert("Signup incomplete", "Please finish the previous steps.");
      router.replace("/auth/sign-up");
    }
  }, [draft, router]);

  function handleOtpChange(value: string) {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    setOtp(digitsOnly.slice(0, OTP_LENGTH));
  }

  async function handleSendOtp() {
    if (sending) {
      return;
    }

    if (!draft.email) {
      Alert.alert("Missing email", "Please go back and add your email.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: draft.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: "safetyonspeed://auth/otp",
        },
      });

      if (error) {
        throw error;
      }

      setSent(true);
      setOtp("");
      Alert.alert("OTP sent", "Check your email for the 6-digit code.");
      otpInputRef.current?.focus();
    } catch (error: any) {
      Alert.alert(
        "Couldn't send OTP",
        error?.message ?? "Please try again in a moment.",
      );
    } finally {
      setSending(false);
    }
  }

  async function finalizeSignup() {
    const { error: updateError } = await supabase.auth.updateUser({
      password: draft.password,
      data: {
        full_name: draft.fullName,
        nick_name: draft.nickName,
        birthdate: draft.birthdate,
        phone_number: draft.phoneNumber,
        guardians: draft.guardians,
      },
    });

    if (updateError) {
      throw updateError;
    }

    clearSignupDraft();
    Alert.alert("Account verified", "You're all set.");
    router.replace("/session");
  }

  async function handleVerify() {
    if (verifying) {
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      Alert.alert("Invalid code", "Please enter the 6-digit code we sent.");
      return;
    }

    if (
      !draft.fullName ||
      !draft.nickName ||
      !draft.birthdate ||
      !draft.phoneNumber ||
      !draft.email ||
      !draft.password ||
      !draft.guardians
    ) {
      Alert.alert("Signup incomplete", "Please finish the previous steps.");
      router.replace("/auth/sign-up");
      return;
    }

    setVerifying(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: draft.email,
        token: otp,
        type: "email",
      });

      if (verifyError) {
        throw verifyError;
      }

      await finalizeSignup();
    } catch (error: any) {
      Alert.alert(
        "Verification failed",
        error?.message ?? "Please check the code and try again.",
      );
    } finally {
      setVerifying(false);
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
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 px-6 pt-12">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-5 py-3 self-start"
          >
            <Text className="text-white text-2xl mr-3">←</Text>
            <Text className="text-white/80 text-3xl font-light">Back</Text>
          </Pressable>

          <View className="mt-12 items-center">
            <Text className="text-white text-6xl font-light">Verify OTP</Text>
            <Text className="text-white/70 text-2xl mt-4 font-light">
              Enter the code we sent to your email.
            </Text>
          </View>

          <View className="mt-12">
            <Text className="text-white/70 text-2xl font-light">
              Step 3 of 3
            </Text>
            <View className="flex-row items-center mt-4">
              <View className="flex-1 h-[3px] rounded-full bg-white/40" />
              <View className="w-3" />
              <View className="flex-1 h-[3px] rounded-full bg-white/40" />
              <View className="w-3" />
              <View className="flex-1 h-[3px] rounded-full bg-secondary" />
            </View>
          </View>

          <View className="mt-12">
            <Text className="text-white/90 text-4xl font-light mb-5">
              OTP code
            </Text>
            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={handleOtpChange}
              placeholder="••••••"
              placeholderTextColor="rgba(255,255,255,0.6)"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              className="text-white text-2xl px-2 py-3"
              maxLength={OTP_LENGTH}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={handleVerify}
            />
            <View className="h-[3px] bg-white/40 rounded-full mt-2" />
            <Text className="text-white/60 text-lg mt-4 font-light">
              We sent the code to {draft.email ?? "your email"}.
            </Text>
          </View>

          <View className="flex-1 justify-end pb-24 mt-10">
            <Pressable
              onPress={handleVerify}
              disabled={!sent || verifying}
              className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
            >
              <Text className="text-white text-3xl font-light text-center">
                {verifying ? "Verifying..." : "Verify"}
              </Text>
            </Pressable>

            <View className="items-center mt-10">
              <Pressable
                onPress={handleSendOtp}
                disabled={sending}
                accessibilityRole="button"
              >
                <Text className="text-secondary text-xl">
                  {sending ? "Sending..." : sent ? "Resend OTP" : "Send OTP"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
