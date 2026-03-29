import { assertSupabaseConfigured, supabase } from "@/lib/superbase";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const OTP_LENGTH = 8;

type Step = "request" | "verify";

export default function ForgotPassword() {
  const router = useRouter();
  const otpInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (loading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      assertSupabaseConfigured("app/auth/forgot-password.tsx handleSendOtp");

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: false },
      });

      if (error) {
        throw error;
      }

      setStep("verify");
      setOtp("");
      Alert.alert(
        "OTP sent",
        "Check your email for the 8-digit code to continue.",
      );
      otpInputRef.current?.focus();
    } catch (error: any) {
      console.error(`[Forgot Password Error] Failed to send OTP. Context: email=${trimmedEmail} | Error:`, error);
      Alert.alert(
        "Couldn't send code",
        error?.message ?? "Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndReset() {
    if (loading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      Alert.alert("Invalid code", "Please enter the 8-digit code we sent.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      Alert.alert(
        "Weak password",
        "Please use at least 8 characters for your new password.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      assertSupabaseConfigured(
        "app/auth/forgot-password.tsx handleVerifyAndReset",
      );

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: otp,
        type: "magiclink",
      });

      if (verifyError) {
        throw verifyError;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();

      Alert.alert(
        "Password updated",
        "You can now sign in with your new password.",
      );
      router.replace("/auth/login");
    } catch (error: any) {
      console.error(`[Forgot Password Error] Failed to verify OTP or reset password. Context: email=${trimmedEmail} | Error:`, error);
      Alert.alert(
        "Verification failed",
        error?.message ?? "Please check the code and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(value: string) {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    setOtp(digitsOnly.slice(0, OTP_LENGTH));
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
          <View className="flex-1 px-6 pt-14">
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-5 py-3 self-start"
            >
              <Text className="text-white text-2xl mr-3">←</Text>
              <Text className="text-white/80 text-3xl font-light">Back</Text>
            </Pressable>

            <View className="mt-16 items-center">
              <Text className="text-white text-6xl font-light">
                Forgot Password
              </Text>
              <Text className="text-white/70 text-2xl mt-4 font-light">
                We&apos;ll send a one-time code to verify you.
              </Text>
            </View>

            <View className="mt-12">
              <Text className="text-white/70 text-2xl font-light">
                {step === "request" ? "Step 1 of 2" : "Step 2 of 2"}
              </Text>
              <View className="flex-row items-center mt-4">
                <View
                  className={`flex-1 h-[3px] rounded-full ${
                    step === "request" ? "bg-secondary" : "bg-white/40"
                  }`}
                />
                <View className="w-3" />
                <View
                  className={`flex-1 h-[3px] rounded-full ${
                    step === "verify" ? "bg-secondary" : "bg-white/40"
                  }`}
                />
              </View>
            </View>

            <View className="mt-12">
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
                editable={step === "request" && !loading}
                className={`text-white text-lg px-2 py-2 ${
                  step === "verify" ? "opacity-60" : ""
                }`}
                returnKeyType={step === "request" ? "send" : "next"}
                blurOnSubmit={false}
                onSubmitEditing={() =>
                  step === "request"
                    ? handleSendOtp()
                    : otpInputRef.current?.focus()
                }
              />
              <View className="h-[3px] bg-white/40 rounded-full mt-2" />
              <Text className="text-white/60 text-lg mt-4 font-light">
                We&apos;ll email a 8-digit code to this address.
              </Text>
            </View>

            {step === "verify" && (
              <View className="mt-14">
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
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
                <View className="h-[3px] bg-white/40 rounded-full mt-2" />

                <Text className="text-white/90 text-4xl font-light mb-5 mt-12">
                  New password
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    ref={passwordInputRef}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    secureTextEntry={!showPassword}
                    textContentType="newPassword"
                    autoCapitalize="none"
                    className="flex-1 text-white text-lg px-2 py-2"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() =>
                      confirmPasswordInputRef.current?.focus()
                    }
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

                <Text className="text-white/90 text-4xl font-light mb-5 mt-12">
                  Confirm password
                </Text>
                <TextInput
                  ref={confirmPasswordInputRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoCapitalize="none"
                  className="text-white text-lg px-2 py-2"
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyAndReset}
                />
                <View className="h-[3px] bg-white/40 rounded-full mt-2" />
              </View>
            )}

            <View className="flex-1 justify-end pb-24">
              {step === "request" ? (
                <Pressable
                  onPress={handleSendOtp}
                  disabled={loading}
                  className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
                >
                  <Text className="text-white text-3xl font-light text-center">
                    {loading ? "Sending..." : "Send OTP"}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={handleVerifyAndReset}
                    disabled={loading}
                    className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
                  >
                    <Text className="text-white text-3xl font-light text-center">
                      {loading ? "Verifying..." : "Verify & Reset"}
                    </Text>
                  </Pressable>

                  <View className="items-center mt-10">
                    <Pressable
                      onPress={handleSendOtp}
                      disabled={loading}
                      accessibilityRole="button"
                    >
                      <Text className="text-secondary text-xl">
                        Didn&apos;t get a code?{" "}
                        <Text className="underline text-accent">Resend</Text>
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setStep("request");
                        setOtp("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      accessibilityRole="button"
                      className="mt-5"
                    >
                      <Text className="text-secondary text-xl">
                        Use a different email
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              <Pressable
                onPress={() => router.replace("/auth/login")}
                accessibilityRole="button"
                className="items-center mt-10"
              >
                <Text className="text-secondary text-xl">
                  Back to <Text className="underline text-accent">Sign in</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
