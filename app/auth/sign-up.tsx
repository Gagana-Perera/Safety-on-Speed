import { setSignupDraft } from "@/lib/signup-draft";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SignUp() {
  const router = useRouter();
  const fullNameInputRef = useRef<TextInput>(null);
  const nickNameInputRef = useRef<TextInput>(null);
  const birthdateInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState("");
  const [nickName, setNickName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function isValidBirthdate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split("-").map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }

  function handleNext() {
    const trimmedFullName = fullName.trim();
    const trimmedNickName = nickName.trim();
    const trimmedBirthdate = birthdate.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    const trimmedEmail = email.trim();
    if (
      !trimmedFullName ||
      !trimmedNickName ||
      !trimmedBirthdate ||
      !trimmedPhoneNumber ||
      !trimmedEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Missing info", "Please fill in all required fields.");
      return;
    }

    if (!isValidBirthdate(trimmedBirthdate)) {
      Alert.alert(
        "Invalid birthdate",
        "Please use the format YYYY-MM-DD for your birthdate."
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Weak password",
        "Please use at least 8 characters for your password."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setSignupDraft({
      fullName: trimmedFullName,
      nickName: trimmedNickName,
      birthdate: trimmedBirthdate,
      phoneNumber: trimmedPhoneNumber,
      email: trimmedEmail,
      password,
      guardians: [],
    });

    router.push("/auth/guardians");
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
          {/* Brand */}
          <View className="items-center">
            <Image
              source={require("../../assets/oc/logo.jpg")}
              resizeMode="contain"
              className="h-24 w-24 mb-4 opacity-80"
            />
            <Text className="text-white/70 text-xl tracking-[4px]">
              Safety On Speed
            </Text>
          </View>

          {/* Title */}
          <View className="mt-14 items-center">
            <Text className="text-white text-6xl font-light">Sign up</Text>
            <Text className="text-white/80 text-2xl mt-4 font-light">
              Create your account.
            </Text>
          </View>

          {/* Inputs */}
          <View className="mt-16">
            <Text className="text-white/90 text-4xl font-light mb-4">
              Full Name
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <TextInput
                ref={fullNameInputRef}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoCapitalize="words"
                autoCorrect={false}
                className="text-white text-xl"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => nickNameInputRef.current?.focus()}
              />
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>

            <Text className="text-white/90 text-4xl font-light mb-4 mt-12">
              Nick Name
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <TextInput
                ref={nickNameInputRef}
                value={nickName}
                onChangeText={setNickName}
                placeholder="Nickname"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoCapitalize="words"
                autoCorrect={false}
                className="text-white text-xl"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => birthdateInputRef.current?.focus()}
              />
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>

            <Text className="text-white/90 text-4xl font-light mb-4 mt-12">
              Birthdate
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <TextInput
                ref={birthdateInputRef}
                value={birthdate}
                onChangeText={setBirthdate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.55)"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
                className="text-white text-xl"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => phoneInputRef.current?.focus()}
              />
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>

            <Text className="text-white/90 text-4xl font-light mb-4 mt-12">
              Phone Number
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <TextInput
                ref={phoneInputRef}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                placeholderTextColor="rgba(255,255,255,0.55)"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                className="text-white text-xl"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailInputRef.current?.focus()}
              />
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>

            <Text className="text-white/90 text-4xl font-light mb-4">
              Email
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <TextInput
                ref={emailInputRef}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.55)"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                className="text-white text-xl"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              <View className="h-[2px] bg-white/35 rounded-full mt-3" />
            </View>

            <Text className="text-white/90 text-4xl font-light mb-4 mt-12">
              Password
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <View className="flex-row items-center">
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-white text-xl"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
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

            <Text className="text-white/90 text-4xl font-light mb-4 mt-12">
              Confirm Password
            </Text>

            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <View className="flex-row items-center">
                <TextInput
                  ref={confirmPasswordInputRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 text-white text-xl"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
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

          {/* Bottom area */}
          <View className="flex-1 justify-end pb-24 mt-10">
            <Pressable
              onPress={handleNext}
              className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
            >
              <Text className="text-white text-3xl font-light text-center">
                Next
              </Text>
            </Pressable>

            <View className="items-center mt-10">
              <Pressable
                onPress={() => router.push("/auth/login")}
                accessibilityRole="button"
              >
                <Text className="text-secondary text-xl">
                  Already have an account?{" "}
                  <Text className="underline text-accent">Sign in.</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
