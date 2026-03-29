import { clearSignupDraft, getSignupDraft } from "@/lib/signup-draft";
import { assertSupabaseConfigured, supabase } from "@/lib/superbase";
import AuthLayout, { authStyles } from "@/components/auth/AuthLayout";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

const OTP_LENGTH = 8;

export default function SignUpOtp() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const otpInputRef = useRef<TextInput>(null);

  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const draft = getSignupDraft();

  function sanitizeNextRoute(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Only allow internal app routes.
    // - Must start with '/'
    // - Disallow protocols and path traversal
    if (!trimmed.startsWith("/")) return null;
    if (trimmed.includes("://")) return null;
    if (trimmed.includes("..")) return null;

    return trimmed;
  }

  useEffect(() => {
    // Trigger send OTP to email on mount if not already sent?
    // Or wait for user?
    // Let's autosend for flow smoothness.
    if (!sent && draft.email && !sending) {
      handleSendOtp();
    }
  }, []);

  useEffect(() => {
    if (sent) {
      otpInputRef.current?.focus();
    }
  }, [sent]);

  function handleOtpChange(value: string) {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    setOtp(digitsOnly.slice(0, OTP_LENGTH));
  }

  async function handleSendOtp() {
    if (sending) return;
    if (!draft.email) {
      Alert.alert("Error", "No email found in draft.");
      return;
    }

    setSending(true);
    try {
      assertSupabaseConfigured("app/auth/otp.tsx handleSendOtp");

      const { error } = await supabase.auth.signInWithOtp({
        email: draft.email,
        options: {
          shouldCreateUser: true,
          // emailRedirectTo: "safetyonspeed://auth/otp",
        },
      });

      if (error) throw error;

      setSent(true);
      Alert.alert("OTP Sent", `We sent a code to ${draft.email}`);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSending(false);
    }
  }

  const requestDataSharingPermission = async (userId: string) => {
    return new Promise<void>((resolve) => {
      Alert.alert(
        'Data Sharing',
        'Allow Safety on Speed to share anonymous usage data to help improve the app?',
        [
          {
            text: 'Decline',
            style: 'cancel',
            onPress: async () => {
              await supabase
                .from('profiles')
                .update({ personal_data_access: false } as any)
                .eq('id', userId);
              await AsyncStorage.setItem('data_sharing_asked', 'true');
              resolve();
            }
          },
          {
            text: 'Allow',
            onPress: async () => {
              await supabase
                .from('profiles')
                .update({ personal_data_access: true } as any)
                .eq('id', userId);
              await AsyncStorage.setItem('data_sharing_asked', 'true');
              resolve();
            }
          }
        ]
      );
    });
  };

  const requestAlertNotificationPermission = async (userId: string) => {
    return new Promise<void>((resolve) => {
      Alert.alert(
        'Safety Alerts',
        'Allow Safety on Speed to send you nearby safety and incident alerts?',
        [
          {
            text: 'Decline',
            style: 'cancel',
            onPress: async () => {
              await supabase
                .from('profiles')
                .update({ alert_notif: false } as any)
                .eq('id', userId);
              await AsyncStorage.setItem('alert_notif_asked', 'true');
              resolve();
            }
          },
          {
            text: 'Allow',
            onPress: async () => {
              await supabase
                .from('profiles')
                .update({ alert_notif: true } as any)
                .eq('id', userId);
              await AsyncStorage.setItem('alert_notif_asked', 'true');
              resolve();
            }
          }
        ]
      );
    });
  };

  async function handleVerify() {
    if (verifying) return;
    if (!draft.email) {
      Alert.alert("Missing email", "Go back and enter your email first.");
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      Alert.alert("Invalid code", `Please enter the ${OTP_LENGTH}-digit code.`);
      return;
    }

    setVerifying(true);
    try {
      assertSupabaseConfigured("app/auth/otp.tsx handleVerify");

      const {
        data: { user },
        error: verifyError,
      } = await supabase.auth.verifyOtp({
        email: draft.email!,
        token: otp,
        type: "email",
      });

      if (verifyError) throw verifyError;
      if (!user) throw new Error("No user returned");

      if (draft.password) {
        const { error: pwError } = await supabase.auth.updateUser({
          password: draft.password,
        });
        if (pwError) console.log("Password set error:", pwError);
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: `${draft.firstName || ""} ${draft.surname || ""}`.trim(),
        phone_number: draft.phoneNumber,
        email: draft.email,
        updated_at: new Date().toISOString(),
      } as any);

      if (profileError) {
        console.error("Profile save error:", profileError);
      }

      await requestDataSharingPermission(user.id);
      await requestAlertNotificationPermission(user.id);
      clearSignupDraft();
      Alert.alert("Success", "Account created successfully!");

      const nextRoute =
        sanitizeNextRoute(params.next) ||
        "/(tabs)";

      router.replace(nextRoute as any);
    } catch (error: any) {
      console.error(
        `[Signup OTP Error] Verification process failed. Context: email=${draft.email} | Error:`,
        error,
      );
      Alert.alert("Verification Failed", error.message);
    } finally {
      setVerifying(false);
    }
  }

  const otpDigits = Array.from({ length: OTP_LENGTH }, (_, index) => otp[index] ?? "");
  const activeIndex =
    otp.length >= OTP_LENGTH ? OTP_LENGTH - 1 : otp.length;

  return (
    <AuthLayout
      eyebrow="Step 4 of 4"
      title="Verify your email"
      subtitle={`Enter the ${OTP_LENGTH}-digit code sent to ${draft.email || "your email address"}.`}
      showBack
      footer={
        <View style={authStyles.footerBlock}>
          <Text style={authStyles.supportingText}>
            Need a fresh code?
          </Text>
          <Text
            style={authStyles.resendLink}
            onPress={sending ? undefined : handleSendOtp}
          >
            {sending ? "Sending..." : "Resend verification code"}
          </Text>
        </View>
      }
    >
      <View style={authStyles.formGrid}>
        <Pressable
          onPress={() => otpInputRef.current?.focus()}
          style={authStyles.otpGrid}
        >
          {otpDigits.map((digit, index) => (
            <View
              key={`otp-${index}`}
              style={[
                authStyles.otpBox,
                digit ? authStyles.otpBoxFilled : null,
                index === activeIndex ? authStyles.otpBoxActive : null,
              ]}
            >
              <Text style={authStyles.otpDigit}>{digit || ""}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={otpInputRef}
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          returnKeyType="done"
          onSubmitEditing={handleVerify}
          style={authStyles.hiddenOtpInput}
        />
        <Pressable
          onPress={handleVerify}
          disabled={verifying}
          style={({ pressed }) => [
            authStyles.primaryButton,
            verifying && authStyles.primaryButtonDisabled,
            pressed && authStyles.pressed,
          ]}
        >
          <Text style={authStyles.primaryButtonText}>
            {verifying ? "Verifying..." : "Verify Code"}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
