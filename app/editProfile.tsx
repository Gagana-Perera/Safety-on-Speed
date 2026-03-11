import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from "./themeContext";
import BackButton from './backButton'; 
import { supabase } from "../lib/superbase";
import { getMergedProfileData } from '../lib/profileService'; // Only need the merged service now

export default function EditProfile() {
  const router = useRouter();
  const { theme } = useTheme();

  // Cleaned up unused individual states, keeping only what we need!
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80";

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

      const byteArray = Uint8Array.from(atob(image.base64), c => c.charCodeAt(0));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const fileExt = image.uri.split('.').pop() || 'jpeg';
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, byteArray, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

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
      const { data: { user } } = await supabase.auth.getUser();
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        
        <View style={{ marginLeft: 16 }}>
          <BackButton color={theme.text} size={24} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Photo Section */}
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
              {uploading ? (
                <View style={[styles.profileAvatar, { borderColor: theme.border, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.card }]}>
                  <ActivityIndicator size="large" color={theme.text} />
                </View>
              ) : (
                <Image
                  source={{ uri: avatarUrl || DEFAULT_AVATAR }}
                  style={[styles.profileAvatar, { borderColor: theme.border }]}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.cameraIconContainer, { borderColor: theme.background }]} 
              onPress={changeAvatar}
              disabled={uploading}
            >
              <Feather name="camera" size={16} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={changeAvatar} disabled={uploading}>
              <Text style={styles.changePhotoText}>
                {uploading ? "Uploading..." : "Change Profile Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            
            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
                <Feather name="user" size={20} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={form.firstName}
                  onChangeText={(text) => setForm({ ...form, firstName: text })}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
                <Feather name="user" size={20} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={form.lastName}
                  onChangeText={(text) => setForm({ ...form, lastName: text })}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
                <Feather name="phone" size={20} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
                <Feather name="mail" size={20} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
                <Feather name="map-pin" size={20} color={theme.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                  placeholder="City, Country"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

          </View>

          {/* Save Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: "#2563eb" }]}>
              {saving ? (
                 <ActivityIndicator color="white" />
              ) : (
                 <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingVertical: 12,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileImageContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 25,
    right: "36%", 
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  changePhotoText: {
    marginTop: 10,
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  form: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#a7a7a7",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  actionContainer: {
    marginTop: 10,
    paddingHorizontal: 24,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
});