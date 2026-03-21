import { loginUser } from "@/lib/auth";
import { globalStyles } from "../global";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Login() {
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);
  const keyboardEnabled = Platform.OS === "ios";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    <View style={globalStyles.loginScreenRoot}>
      <ImageBackground
        source={require("../../assets/oc/bgImage.png")}
        style={globalStyles.loginBackdrop}
        imageStyle={globalStyles.loginBackdropImage}
        resizeMode="cover"
      >
        <View style={globalStyles.loginBackdropTint} />
      </ImageBackground>

      <KeyboardAvoidingView
        style={globalStyles.loginForegroundLayer}
        behavior="padding"
        enabled={keyboardEnabled}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView
          style={globalStyles.loginForegroundLayer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={globalStyles.loginScrollContent}
        >
          <View style={globalStyles.loginContent}>
            <View style={globalStyles.loginHeader}>
              <Text style={globalStyles.loginTitle}>Sign in</Text>
              <Text style={globalStyles.loginSubtitle}>Welcome, user.</Text>
            </View>

            <View style={globalStyles.loginForm}>
              <View style={globalStyles.loginFieldGroup}>
                <Text style={globalStyles.loginFieldLabel}>User Name</Text>
                <View style={globalStyles.loginInputFrame}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder=""
                    placeholderTextColor="rgba(234, 246, 255, 0.45)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    style={globalStyles.loginInput}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                  <View style={globalStyles.loginInputUnderline} />
                </View>
              </View>

              <View style={globalStyles.loginFieldGroup}>
                <Text style={globalStyles.loginFieldLabel}>Password</Text>
                <View style={globalStyles.loginInputFrame}>
                  <TextInput
                    ref={passwordInputRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder=""
                    placeholderTextColor="rgba(234, 246, 255, 0.45)"
                    secureTextEntry
                    style={globalStyles.loginInput}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <View style={globalStyles.loginInputUnderline} />
                </View>
              </View>
            </View>

            <View style={globalStyles.loginBottomArea}>
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  globalStyles.loginSubmitButton,
                  loading && globalStyles.loginSubmitButtonDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={globalStyles.loginSubmitButtonText}>
                  {loading ? "Signing in..." : "Sign in"}
                </Text>
              </Pressable>

              <View style={globalStyles.loginLinks}>
                <Pressable
                  onPress={() => router.push("/auth/sign-up")}
                  accessibilityRole="button"
                >
                  <Text style={globalStyles.loginLinkText}>
                    Don't have an account?{" "}
                    <Text style={globalStyles.loginLinkUnderline}>Sign up.</Text>
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/auth/forgot-password")}
                  accessibilityRole="button"
                >
                  <Text style={globalStyles.loginLinkText}>
                    Forgot Password ?{" "}
                    <Text style={globalStyles.loginLinkUnderline}>Try another way</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
