import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { getSignupDraft, setSignupDraft } from "@/lib/signup-draft";

type ContactItem = {
  id: string;
  name: string;
  phone: string;
};

export default function Guardians() {
  const router = useRouter();
  const [guardians, setGuardians] = useState<ContactItem[]>([]);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  useEffect(() => {
    const draft = getSignupDraft();
    if (
      !draft.fullName ||
      !draft.nickName ||
      !draft.birthdate ||
      !draft.phoneNumber ||
      !draft.email ||
      !draft.password
    ) {
      Alert.alert("Signup incomplete", "Please finish step 1 first.");
      router.replace("/auth/sign-up");
      return;
    }

    if (draft.guardians && draft.guardians.length > 0) {
      setGuardians(draft.guardians);
    }
  }, [router]);

  const selectedCount = guardians.length;

  function handleAddGuardian() {
    const name = guardianName.trim();
    const phone = guardianPhone.trim();

    if (!name || !phone) {
      Alert.alert("Missing info", "Please enter a name and phone number.");
      return;
    }

    const newGuardian: ContactItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      phone,
    };

    setGuardians((prev) => [...prev, newGuardian]);
    setGuardianName("");
    setGuardianPhone("");
  }

  function handleRemoveGuardian(id: string) {
    setGuardians((prev) => prev.filter((guardian) => guardian.id !== id));
  }

  function handleContinue() {
    if (selectedCount < 2) {
      Alert.alert(
        "Select at least two",
        "Please choose two or more guardians to continue."
      );
      return;
    }

    setSignupDraft({
      guardians,
    });

    router.push("/auth/otp");
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
            <Text className="text-white text-6xl font-light">
              Add Guardians
            </Text>
            <Text className="text-white/70 text-2xl mt-4 font-light">
              Add at least two trusted guardians.
            </Text>
          </View>

          <View className="mt-12">
            <Text className="text-white/70 text-2xl font-light">
              Step 2 of 3
            </Text>
            <View className="flex-row items-center mt-4">
              <View className="flex-1 h-[3px] rounded-full bg-white/40" />
              <View className="w-3" />
              <View className="flex-1 h-[3px] rounded-full bg-secondary" />
              <View className="w-3" />
              <View className="flex-1 h-[3px] rounded-full bg-white/40" />
            </View>
          </View>

          <View className="mt-10">
            <View className="bg-white/5 border border-white/10 rounded-2xl px-5 pt-3 pb-4">
              <Text className="text-white/90 text-xl font-light mb-3">
                Guardian name
              </Text>
              <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <TextInput
                  value={guardianName}
                  onChangeText={setGuardianName}
                  placeholder="Full name"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  autoCapitalize="words"
                  autoCorrect={false}
                  className="text-white text-lg"
                />
              </View>

              <Text className="text-white/90 text-xl font-light mt-6 mb-3">
                Guardian phone
              </Text>
              <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <TextInput
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  placeholder="Phone number"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="text-white text-lg"
                />
              </View>

              <Pressable
                onPress={handleAddGuardian}
                className="mt-6 self-start bg-black/25 border border-white/10 rounded-2xl px-6 py-3"
              >
                <Text className="text-white text-xl">Add guardian</Text>
              </Pressable>
            </View>

            {guardians.length > 0 && (
              <View className="mt-8">
                <Text className="text-white/80 text-2xl font-light mb-4">
                  Added guardians
                </Text>
                {guardians.map((guardian) => (
                  <View
                    key={guardian.id}
                    className="flex-row items-center justify-between border border-white/10 rounded-2xl px-5 py-4 mb-4 bg-white/5"
                  >
                    <View>
                      <Text className="text-white text-xl font-light">
                        {guardian.name}
                      </Text>
                      <Text className="text-white/60 text-base mt-1">
                        {guardian.phone}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveGuardian(guardian.id)}
                      className="px-3 py-2"
                    >
                      <Feather name="trash-2" size={20} color="#FF6B6B" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="flex-1 justify-end pb-24 mt-10">
            <Text className="text-white/70 text-lg text-center mb-4">
              Selected: {selectedCount}
            </Text>
            <Pressable
              onPress={handleContinue}
              disabled={selectedCount < 2}
              className="self-center bg-black/25 border border-white/10 rounded-2xl px-10 py-4"
            >
              <Text className="text-white text-3xl font-light text-center">
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
