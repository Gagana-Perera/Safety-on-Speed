import { setSignupDraft } from "@/lib/signup-draft";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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

export default function SignUp() {
  const router = useRouter();
  const surnameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const nicInputRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nicNumber, setNicNumber] = useState("");

  function handleNext() {
    const trimmedFirstName = firstName.trim();
    const trimmedSurname = surname.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    const trimmedNicNumber = nicNumber.trim();

    if (
      !trimmedFirstName ||
      !trimmedSurname ||
      !trimmedPhoneNumber ||
      !trimmedNicNumber
    ) {
      Alert.alert("Missing info", "Please fill in all details.");
      return;
    }

    setSignupDraft({
      firstName: trimmedFirstName,
      surname: trimmedSurname,
      phoneNumber: trimmedPhoneNumber,
      nicNumber: trimmedNicNumber,
    });

    router.push("/auth/sign-up-password");
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
          <View className="items-center mb-10">
            <Text className="text-white text-6xl font-light tracking-wider">
              Sign up
            </Text>
          </View>

          {/* Inputs */}
          <View className="mt-4">
            <View className="flex-row justify-between">
              <View className="w-[48%]">
                <Text className="text-white text-2xl font-light mb-2">
                  First Name
                </Text>
                <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    className="text-white text-lg"
                    returnKeyType="next"
                    onSubmitEditing={() => surnameInputRef.current?.focus()}
                  />
                </View>
                <View className="h-[2px] bg-white/30 rounded-full mt-2 mx-1" />
              </View>

              <View className="w-[48%]">
                <Text className="text-white text-2xl font-light mb-2">
                  Surname
                </Text>
                <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <TextInput
                    ref={surnameInputRef}
                    value={surname}
                    onChangeText={setSurname}
                    autoCapitalize="words"
                    autoCorrect={false}
                    className="text-white text-lg"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                  />
                </View>
                <View className="h-[2px] bg-white/30 rounded-full mt-2 mx-1" />
              </View>
            </View>

            <View className="mt-8">
              <Text className="text-white text-2xl font-light mb-2">
                Phone Number
              </Text>
              <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <TextInput
                  ref={phoneInputRef}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="text-white text-lg"
                  returnKeyType="next"
                  onSubmitEditing={() => nicInputRef.current?.focus()}
                />
              </View>
              <View className="h-[2px] bg-white/30 rounded-full mt-2 mx-2" />
            </View>

            <View className="mt-8">
              <Text className="text-white text-2xl font-light mb-2">
                NIC Number
              </Text>
              <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <TextInput
                  ref={nicInputRef}
                  value={nicNumber}
                  onChangeText={setNicNumber}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className="text-white text-lg"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
              </View>
              <View className="h-[2px] bg-white/30 rounded-full mt-2 mx-2" />
            </View>
          </View>

          {/* Next Button */}
          <View className="flex-1 justify-end pb-10 mt-10">
            <Pressable
              onPress={handleNext}
              className="self-end bg-black/40 border border-white/10 rounded-2xl px-12 py-3"
            >
              <Text className="text-white text-2xl font-light">Next</Text>
            </Pressable>
            <View className="items-center mt-8">
              <Pressable
                onPress={() => router.push("/auth/login")}
                accessibilityRole="button"
              >
                <Text className="text-secondary text-lg">
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
