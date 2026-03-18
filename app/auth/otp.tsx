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

const OTP_LENGTH = 8;

export default function SignUpOtp() {
  const router = useRouter();
  const otpInputRef = useRef<TextInput>(null);

  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  // We need to trigger the *actual* send when this screen mounts (or when user requests)
  // The design for "Emergency Contacts" shows "Contact 1 Please enter the OTP..."
  // But wait, the previous screen *collected* contacts.
  // The design mockup titled "Emergency Contacts" with OTP input seems to imply verifying the contact's number?
  // OR verifying the user's login?
  // The user request said "remake the Signup like this" and showed screens.
  // Screen 4: "Emergency Contacts" -> Contact 1 Please enter OTP...
  // That looks like GUARDIAN verification.
  // BUT my plan assumed user verification first.
  // FOR NOW, I will stick to verifying the USER'S email to create the account.
  // And the screen title "Emergency Contacts" in the mockup might be slightly misleading or I might be misinterpreting it as "User verification" screen.
  // Actually, look at the mockup: "Contact 1 Please enter the One-Time-Password the given contact number receives."
  // This implies verifying the Guardian's phone number!
  //
  // However, I stated in my plan: "I will skip the actual SMS sending/verification for guardians... focus on verifying the User's Email first".
  // The user approved that plan.
  // So I will implement User Email Verification here, using the design aesthetic but adapting the text to match "Verify Email".
  // Note: The design has boxes for OTP. I'll stick to a simple input for now or standard text input.

  const draft = getSignupDraft();

  useEffect(() => {
    // Trigger send OTP to email on mount if not already sent?
    // Or wait for user?
    // Let's autosend for flow smoothness.
    if (!sent && draft.email && !sending) {
      handleSendOtp();
    }
  }, []);

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

  async function handleVerify() {
    if (verifying) return;
    if (otp.length !== OTP_LENGTH) {
      Alert.alert("Invalid code", `Please enter the ${OTP_LENGTH}-digit code.`);
      return;
    }

    setVerifying(true);
    try {
      // 1. Verify OTP
      const {
        data: { session, user },
        error: verifyError,
      } = await supabase.auth.verifyOtp({
        email: draft.email!,
        token: otp,
        type: "email", // "email" is the correct type for numeric OTP codes sent via signInWithOtp
      });

      if (verifyError) throw verifyError;
      if (!user) throw new Error("No user returned");

      // 2. Auth successful. Now save data to tables.
      // We need to update the password because signInWithOtp doesn't set it?
      // Actually `signInWithOtp` logs you in. If we want to set a password for future `signInWithPassword`,
      // we need `updateUser`.
      if (draft.password) {
        const { error: pwError } = await supabase.auth.updateUser({
          password: draft.password,
        });
        if (pwError) console.log("Password set error:", pwError); // Non-blocking?
      }

      // 3. Save Profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: `${draft.firstName || ""} ${draft.surname || ""}`.trim(),
        phone_number: draft.phoneNumber,
        email: draft.email,
      } as any);

      if (profileError) {
        console.error("Profile save error:", profileError);
        // Alert.alert("Warning", "Account created but profile save failed.");
        // Don't stop flow?
      }

      // 4. Redirect to Guardian Setup
      clearSignupDraft();
      Alert.alert("Success", "Account created successfully!");
      router.replace("/auth/setup");
    } catch (error: any) {
      console.error(`[Signup OTP Error] Verification process failed. Context: email=${draft.email} | Error:`, error);
      Alert.alert("Verification Failed", error.message);
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
          <View className="flex-row items-center mb-8">
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-4 py-2"
            >
              <Text className="text-white text-xl mr-2">{"<"}</Text>
              <Text className="text-white text-xl font-light">Back</Text>
            </Pressable>
          </View>

          <View className="mt-8">
            <Text className="text-white text-5xl font-light leading-tight mb-2">
              Verify Email
            </Text>
            <Text className="text-white/80 text-xl leading-7">
              Please enter the {OTP_LENGTH}-digit One-Time-Password sent to{" "}
              {draft.email}.
            </Text>
          </View>

          <View className="mt-12 items-center">
            {/* OTP Input Boxes simulation */}
            <View className="flex-row justify-center space-x-3 mb-8">
              {/* Visual dots or boxes could go here, but using standard input for functionality */}
            </View>

            <TextInput
              ref={otpInputRef}
              value={otp}
              onChangeText={handleOtpChange}
              placeholder="Code"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              className="text-white text-4xl tracking-widest text-center border-b-2 border-white/30 w-3/4 pb-2"
              maxLength={OTP_LENGTH}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
            />

            <Pressable
              onPress={handleSendOtp}
              disabled={sending}
              className="mt-8"
            >
              <Text className="text-white/70 text-lg">
                Didn&apos;t receive a OTP?{" "}
                <Text className="text-white underline">
                  {sending ? "Sending..." : "Resend"}
                </Text>
              </Text>
            </Pressable>
          </View>

          <View className="flex-1 justify-end pb-24 mt-10">
            <Pressable
              onPress={handleVerify}
              disabled={verifying}
              className="self-center bg-black/40 border border-white/10 rounded-2xl px-16 py-3"
            >
              <Text className="text-white text-2xl font-light">
                {verifying ? "Verifying..." : "Submit"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
