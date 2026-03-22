import { loginUser } from "@/lib/auth";
import AuthLayout, {
  AuthField,
  authStyles,
} from "@/components/auth/AuthLayout";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Login() {
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (loading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginUser(trimmedEmail, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error(`[Login Error] Failed to authenticate user. Context: email=${trimmedEmail} | Error:`, error);
      Alert.alert(
        "Login failed",
        error?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome Back"
      title="Sign in"
      subtitle="Jump back into your safety dashboard, alerts, and trusted contacts."
      titleAlign="center"
      footer={
        <View style={authStyles.footerBlock}>
          <Text style={authStyles.secondaryText}>
            New here?{" "}
            <Text
              style={authStyles.footerLink}
              onPress={() => router.push("/auth/sign-up")}
            >
              Create an account
            </Text>
          </Text>
          <Text
            style={authStyles.footerMutedLink}
            onPress={() => router.push("/auth/forgot-password")}
          >
            Forgot your password?
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
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          textContentType="username"
        />
        <AuthField
          ref={passwordInputRef}
          value={password}
          onChangeText={setPassword}
          label="Password"
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          textContentType="password"
          suffix={
            <Pressable onPress={() => setShowPassword((prev) => !prev)}>
              <Text style={authStyles.toggleText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </Pressable>
          }
        />
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [
            authStyles.primaryButton,
            loading && authStyles.primaryButtonDisabled,
            pressed && authStyles.pressed,
          ]}
        >
          <Text style={authStyles.primaryButtonText}>
            {loading ? "Signing in..." : "Sign in"}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
