import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    getMergedProfileData
} from "../lib/profileService";
import { supabase } from "../lib/superbase";
import BackButton from "./backButton";
import { useTheme } from "@/components/theme/ThemeContext";
import { globalStyles } from "@/app/global";
export default function EditProfile() {
  const router = useRouter();
  const { theme } = useTheme();

  // Cleaned up unused individual states, keeping only what we need!
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const { t } = useTranslation();

  const DEFAULT_AVATAR =
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    location: "",
  });

  // --- 1. THE FETCH LOGIC ---
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getMergedProfileData();
        
        if (data) {
          // Split the merged fullName back into First and Last for the inputs
          const nameParts = data.fullName ? data.fullName.trim().split(/\s+/) : [];
          const first = nameParts[0] || "";
          const last = nameParts.slice(1).join(" ") || ""; 

          setForm({
            firstName: first,
            lastName: last,
            phone: data.phone || "", 
            email: data.email || "", 
            location: data.location || "", 
          });

          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        }
      } catch (error) {
        console.log("Error loading:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- 2. UPLOAD AVATAR ---
  const changeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      const image = result.assets[0];
      if (!image.base64) throw new Error("No base64 data");

      setUploading(true);

      const byteArray = Uint8Array.from(atob(image.base64), (c) =>
        c.charCodeAt(0),
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const fileExt = image.uri.split(".").pop() || "jpeg";
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Safe save: use UPSERT just in case the profile row doesn't exist yet
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, avatar_url: publicUrl });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      console.log("Error uploading image:", error);
      Alert.alert("Upload Failed", error?.message || "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  // --- 3. THE SAVE LOGIC ---
  const handleSave = async () => {
    if (saving) return; 

    if (!form.firstName || !form.lastName) {
      Alert.alert("Missing Info", "Please provide both your first and last name.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Combine names back into one string for the database
      const full_name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

      // UPSERT creates the row if missing, updates if it exists!
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id, // Mandatory to link to auth user
          full_name: full_name,
          phone_number: form.phone,
          email: form.email,
          location: form.location,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Could not save profile.");
      console.log("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[globalStyles.editProfileLoadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[globalStyles.editProfileContainer, { backgroundColor: theme.background }]}>
        <View style={{ marginLeft: 16, marginTop: 16 }}>
          <BackButton color={theme.text} size={24} />
        </View>

        <ScrollView contentContainerStyle={globalStyles.editProfileScrollContent}>
          {/* Photo Section */}
          <View style={globalStyles.editProfileImageContainer}>
            <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
              {uploading ? (
                <View
                  style={[
                    globalStyles.editProfileAvatar,
                    {
                      borderColor: theme.border,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: theme.card,
                    },
                  ]}
                >
                  <ActivityIndicator size="large" color={theme.text} />
                </View>
              ) : (
                <Image
                  source={{ uri: avatarUrl || DEFAULT_AVATAR }}
                  style={[globalStyles.editProfileAvatar, { borderColor: theme.border }]}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                globalStyles.editProfileCameraIconContainer,
                { borderColor: theme.background },
              ]}
              onPress={changeAvatar}
              disabled={uploading}
            >
              <Feather name="camera" size={16} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
              <Text style={globalStyles.editProfileChangePhotoText}>
                {uploading ? "Uploading..." : t('change_profile_photo')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={globalStyles.editProfileForm}>
            {/* First Name */}
            <View style={globalStyles.editProfileInputGroup}>
              <Text style={globalStyles.editProfileLabel}>{t('first_name')}</Text>
              <View
                style={[globalStyles.editProfileInputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="user"
                  size={20}
                  color={theme.icon}
                  style={globalStyles.editProfileInputIcon}
                />
                <TextInput
                  style={[globalStyles.editProfileInput, { color: theme.text }]}
                  value={form.firstName}
                  onChangeText={(text) => setForm({ ...form, firstName: text })}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Last Name */}
            <View style={globalStyles.editProfileInputGroup}>
              <Text style={globalStyles.editProfileLabel}>{t('last_name')}</Text>
              <View
                style={[globalStyles.editProfileInputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="user"
                  size={20}
                  color={theme.icon}
                  style={globalStyles.editProfileInputIcon}
                />
                <TextInput
                  style={[globalStyles.editProfileInput, { color: theme.text }]}
                  value={form.lastName}
                  onChangeText={(text) => setForm({ ...form, lastName: text })}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={globalStyles.editProfileInputGroup}>
              <Text style={globalStyles.editProfileLabel}>{t('phone_number')}</Text>
              <View
                style={[globalStyles.editProfileInputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="phone"
                  size={20}
                  color={theme.icon}
                  style={globalStyles.editProfileInputIcon}
                />
                <TextInput
                  style={[globalStyles.editProfileInput, { color: theme.text }]}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={globalStyles.editProfileInputGroup}>
              <Text style={globalStyles.editProfileLabel}>{t('email_address')}</Text>
              <View
                style={[globalStyles.editProfileInputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={theme.icon}
                  style={globalStyles.editProfileInputIcon}
                />
                <TextInput
                  style={[globalStyles.editProfileInput, { color: theme.text }]}
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Location Input */}
            <View style={globalStyles.editProfileInputGroup}>
              <Text style={globalStyles.editProfileLabel}>{t('location')}</Text>
              <View
                style={[globalStyles.editProfileInputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="map-pin"
                  size={20}
                  color={theme.icon}
                  style={globalStyles.editProfileInputIcon}
                />
                <TextInput
                  style={[globalStyles.editProfileInput, { color: theme.text }]}
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                  placeholder="City, Country"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <View style={globalStyles.editProfileActionContainer}>
            <TouchableOpacity
              onPress={handleSave}
              style={[globalStyles.editProfileSaveButton, { backgroundColor: "#2563eb" }]}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={globalStyles.editProfileSaveButtonText}>{t('save_changes')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
