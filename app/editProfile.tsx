import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getUserProfile, updateUserProfile } from "../lib/profileService";
import { supabase } from "../lib/superbase";
import BackButton from "./backButton";
import { useTheme } from "./themeContext";

export default function EditProfile() {
  const router = useRouter();

  // Get the theme object
  const { theme } = useTheme();

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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const profile = await getUserProfile(user.id);

          if (profile) {
            const fullName = profile.full_name || "";
            const nameParts = fullName.split(" ");
            const first = nameParts[0] || "";
            const last = nameParts.slice(1).join(" ") || "";

            setForm({
              firstName: first,
              lastName: last,
              phone: profile.phone_number || "",
              email: profile.email || user.email || "",
              location: profile.location || "",
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
    if (saving) return;
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

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
        { text: "OK", onPress: () => router.back() },
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
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    // Apply dynamic background color
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Pass dynamic color to BackButton */}
        <View style={{ margin: 20, marginTop: 10 }}>
          <BackButton color={theme.text} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Photo Section */}
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80",
              }}
              // Use theme.border for the avatar border
              style={[styles.profileAvatar, { borderColor: theme.border }]}
            />
            <TouchableOpacity
              style={[
                styles.cameraIconContainer,
                { borderColor: theme.background },
              ]}
              onPress={() =>
                Alert.alert("Upload Photo", "Open gallery or camera logic here")
              }
            >
              <Feather name="camera" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <View
                style={[styles.inputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="user"
                  size={20}
                  color={theme.icon}
                  style={styles.inputIcon}
                />
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
              <View
                style={[styles.inputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="user"
                  size={20}
                  color={theme.icon}
                  style={styles.inputIcon}
                />
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
              <View
                style={[styles.inputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="phone"
                  size={20}
                  color={theme.icon}
                  style={styles.inputIcon}
                />
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
              <View
                style={[styles.inputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={theme.icon}
                  style={styles.inputIcon}
                />
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
              <View
                style={[styles.inputContainer, { backgroundColor: theme.card }]}
              >
                <Feather
                  name="map-pin"
                  size={20}
                  color={theme.icon}
                  style={styles.inputIcon}
                />
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
            {/* You can use a specific color like Blue (#2563eb) or use theme.card with a border */}
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: "#2563eb" }]}
            >
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
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    paddingVertical: 12, // Reduced slightly to account for SafeAreaView
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  /** Photo Section */
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
  /** Form */
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
  /** Action Button */
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
