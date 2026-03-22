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

export default function SignUp() {
  const router = useRouter();
  const draft = getSignupDraft();
  const surnameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const nicInputRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState(draft.firstName ?? "");
  const [surname, setSurname] = useState(draft.surname ?? "");
  const [phoneNumber, setPhoneNumber] = useState(draft.phoneNumber ?? "");
  const [nicNumber, setNicNumber] = useState(draft.nicNumber ?? "");

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
    <AuthLayout
      eyebrow="Step 1 of 4"
      title="Create your account"
      subtitle="Start with the essentials we need to build your safety profile."
      showBack
      footer={
        <View style={authStyles.footerBlock}>
          <Text style={authStyles.secondaryText}>
            Already registered?{" "}
            <Text
              style={authStyles.footerLink}
              onPress={() => router.push("/auth/login")}
            >
              Sign in
            </Text>
          </Text>
        </View>
      }
    >
      <View style={authStyles.formGrid}>
        <View style={authStyles.formRow}>
          <AuthField
            containerStyle={authStyles.halfField}
            value={firstName}
            onChangeText={setFirstName}
            label="First Name"
            placeholder="Amara"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => surnameInputRef.current?.focus()}
          />
          <AuthField
            ref={surnameInputRef}
            containerStyle={authStyles.halfField}
            value={surname}
            onChangeText={setSurname}
            label="Surname"
            placeholder="Perera"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => phoneInputRef.current?.focus()}
          />
        </View>
        <AuthField
          ref={phoneInputRef}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          label="Phone Number"
          placeholder="+94 77 123 4567"
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => nicInputRef.current?.focus()}
        />
        <AuthField
          ref={nicInputRef}
          value={nicNumber}
          onChangeText={setNicNumber}
          label="NIC Number"
          placeholder="200012345678"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleNext}
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
