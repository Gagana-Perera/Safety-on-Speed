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
// Assuming BackButton is in the same folder structure as your Profile component
import BackButton from './backButton'; 

import { supabase } from "../lib/superbase"; 
import { getUserProfile, updateUserProfile, UserProfile } from "../lib/profileService";

export default function EditProfile() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    location: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          
          if (profile) {
            // Logic to split "Full Name" into First/Last for your inputs
            const fullName = profile.full_name || "";
            const nameParts = fullName.split(" ");
            const first = nameParts[0] || "";
            const last = nameParts.slice(1).join(" ") || "";

            setForm({
              firstName: first,
              lastName: last,
              phone: profile.phone_number || "",
              email: profile.email || user.email || "", // Fallback to auth email
              location: profile.location || "", // Ensure 'location' column exists in Supabase
            });
          }
        }
      } catch (error) {
        console.log("Error loading:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    if (saving) return; // Prevent double clicks
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Combine First + Last name back into one string
      const full_name = `${form.firstName} ${form.lastName}`.trim();

      const updates = {
        full_name,
        phone_number: form.phone,
        email: form.email,
        location: form.location,
        updated_at: new Date().toISOString(),
      };

      await updateUserProfile(user.id, updates);
      
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      Alert.alert("Error", "Could not save profile.");
      console.log(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#002747" }}>
      <View style={styles.container}>
        
        <BackButton color="#fff" size={24} />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Photo Section */}
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80",
              }}
              style={styles.profileAvatar}
            />
            <TouchableOpacity 
              style={styles.cameraIconContainer} 
              onPress={() => Alert.alert("Upload Photo", "Open gallery or camera logic here")}
            >
              <Feather name="camera" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#8FD3FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.firstName}
                  onChangeText={(text) => setForm({ ...form, firstName: text })}
                  placeholder="Enter your name"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#8FD3FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.lastName}
                  onChangeText={(text) => setForm({ ...form, lastName: text })}
                  placeholder="Enter your name"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Feather name="phone" size={20} color="#8FD3FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor="#6b7280"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#8FD3FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  placeholder="Enter email"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

             {/* Location Input */}
             <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputContainer}>
                <Feather name="map-pin" size={20} color="#8FD3FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                  placeholder="City, Country"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

          </View>

          {/* Save Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#002747",
    paddingVertical: 24,
    paddingHorizontal: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  /** Photo Section */
  profileImageContainer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#fff",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 25,
    right: "36%", // Adjust based on avatar size to place it on the corner
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#002747",
  },
  changePhotoText: {
    marginTop: 10,
    color: "#007bff",
    fontSize: 14,
    fontWeight: "600",
  },
  /** Form */
  form: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a7a7a7",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E3C5A",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: "#fff",
    fontSize: 16,
  },
  /** Action Button */
  actionContainer: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  saveBtn: {
    backgroundColor: "#1E3C5A",
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