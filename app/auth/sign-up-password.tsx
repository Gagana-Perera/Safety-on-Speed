import AuthLayout, {
  AuthField,
  authStyles,
} from "@/components/auth/AuthLayout";
import { getSignupDraft, setSignupDraft } from "@/lib/signup-draft";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Alert,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

export default function SignUpPassword() {
  const router = useRouter();
  const draft = getSignupDraft();
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [password, setPassword] = useState(draft.password ?? "");
  const [confirmPassword, setConfirmPassword] = useState(draft.password ?? "");
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
    <AuthLayout
      eyebrow="Step 2 of 4"
      title="Choose a password"
      subtitle="Use a strong password so quick access stays private to you."
      showBack
      footer={
        <View style={authStyles.footerBlock}>
          <Text style={authStyles.supportingText}>
            At least 8 characters. A mix of letters, numbers, and symbols is
            best.
          </Text>
        </View>
      }
    >
      <View style={authStyles.formGrid}>
        <AuthField
          value={password}
          onChangeText={setPassword}
          label="Password"
          placeholder="Create a password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          textContentType="newPassword"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          suffix={
            <Pressable onPress={() => setShowPassword((prev) => !prev)}>
              <Text style={authStyles.toggleText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          }
        />
        <AuthField
          ref={confirmPasswordInputRef}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          label="Confirm Password"
          placeholder="Repeat your password"
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleNext}
          suffix={
            <Pressable
              onPress={() => setShowConfirmPassword((prev) => !prev)}
            >
              <Text style={authStyles.toggleText}>
                {showConfirmPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          }
        />
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            authStyles.primaryButton,
            pressed && authStyles.pressed,
          ]}
        >
          <Text style={authStyles.primaryButtonText}>Continue</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
