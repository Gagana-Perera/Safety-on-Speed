import { Feather } from "@expo/vector-icons";
import React, { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import BackButton from '../backButton';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import { supabase } from "../../lib/superbase"; 
import { getUserProfile, UserProfile } from "../../lib/profileService";

export default function Profile() {

  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    darkMode: false,
    emailNotifications: false,
    pushNotifications: false,
    alertNotifications: false,
    dataPermission: false,
    camPermission: false,
    locPermissions: false,
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchProfile() {
        try {
          setLoading(true);
          const { data: { user } } = await supabase.auth.getUser();

          if (user && isActive) {
            const data = await getUserProfile(user.id);
            if (data) setProfile(data);
          }
        } catch (error) {
          console.log('Error loading profile:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      }

      fetchProfile();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleSignOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => { 
          // 1. Tell Supabase to sign out
          await supabase.auth.signOut();
          
          // 2. Navigate user back to the Login screen
          // (Make sure '/login' matches your actual login file path)
          router.replace("/login"); 
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B253A" }}>
      <View style={styles.container}>
        {/* Back Button */}
        <BackButton color="#fff" size={24} />
        <ScrollView>
          {/* ------------- User Profile Section ------------- */}

          <View style={styles.profile}>
            <Image
              source={{
                uri: profile?.avatar_url || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80",
              }}
              style={styles.profileAvatar}
            />

            <Text style={styles.profileName}>
                {profile?.full_name?.replace(/\s+/g, ' ').trim() || "New User"}
            </Text>

            <Text style={styles.profileNumber}>
                {profile?.phone_number || "No Phone Number"}
            </Text>

            <Text style={styles.profileEmail}>
                {profile?.email || "No Email"}
            </Text>

            <TouchableOpacity 
              onPress={() => router.push("/editProfile")} 
              style={{ backgroundColor: '#305d7b', padding: 10, borderRadius: 8, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: "bold" }}>Edit Profile </Text>
              <Feather name="edit" size={18} color="white" style={{ marginRight: 8 }} />
            </TouchableOpacity>
          </View>

          {/* ------------- Preferences Section ------------- */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            {/* Language Selection Row */}
            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={styles.row}
            >
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="globe" size={20} />
              </View>

              <Text style={styles.rowLabel}>Language</Text>

              <View style={styles.rowSpacer} />

              <Text style={styles.rowValue}>English</Text>

              <Feather color="#C6C6C6" name="chevron-right" size={20} />
            </TouchableOpacity>

            {/* Dark Mode Toggle */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="moon" size={20} />
              </View>

              <Text style={styles.rowLabel}>Dark Mode</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={(darkMode) => setForm({ ...form, darkMode })}
                value={form.darkMode}
              />
            </View>

            {/* Location Row */}
            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={styles.row}
            >
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="navigation" size={20} />
              </View>

              <Text style={styles.rowLabel}>Location</Text>

              <View style={styles.rowSpacer} />

              <Text style={styles.rowValue}>Los Angeles, CA</Text>

              <Feather color="#C6C6C6" name="chevron-right" size={20} />
            </TouchableOpacity>
          </View>

          {/* ------------- Notification & Permission Section ------------- */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Notifications & Permissions
            </Text>

            {/* Email Notifications */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="at-sign" size={20} />
              </View>

              <Text style={styles.rowLabel}>Email Notifications</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={(emailNotifications) =>
                  setForm({ ...form, emailNotifications })
                }
                value={form.emailNotifications}
              />
            </View>

            {/* Push Notifications */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="bell" size={20} />
              </View>

              <Text style={styles.rowLabel}>Push Notifications</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={(pushNotifications) =>
                  setForm({ ...form, pushNotifications })
                }
                value={form.pushNotifications}
              />
            </View>

            {/* Alert Notifications */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="alert-triangle" size={20} />
              </View>

              <Text style={styles.rowLabel}>Alert Notifications</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={(alertNotifications) =>
                  setForm({ ...form, alertNotifications })
                }
                value={form.alertNotifications}
              />
            </View>

            {/* Data Permission */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="file-text" size={20} />
              </View>

              <Text style={styles.rowLabel}>Personal Data Access</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={(dataPermission) =>
                  setForm({ ...form, dataPermission })
                }
                value={form.dataPermission}
              />
            </View>

            {/* Camera and Audio Permission */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="camera" size={20} />
              </View>

              <Text style={styles.rowLabel}>Camera & Audio Access</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={(camPermission) =>
                  setForm({ ...form, camPermission })
                }
                value={form.camPermission}
              />
            </View>

            {/* Live Location Permission */}
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather color="#8FD3FF" name="map-pin" size={20} />
              </View>

              <Text style={styles.rowLabel}>Live Location Access</Text>

              <View style={styles.rowSpacer} />

              <Switch
                onValueChange={(locPermissions) =>
                  setForm({ ...form, locPermissions })
                }
                value={form.locPermissions}
              />
            </View>
          </View>

          {/* -------------------- LOGOUT BUTTON -------------------- */}

          <View style={styles.logoutContainer}>
            <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
              <Feather name="log-out" size={20} color="#fff" />
              <Text style={styles.logoutBtnText}>Log Out</Text>
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
    paddingHorizontal: 16,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  /** Profile */
  profile: {
    padding: 24,
    borderRadius: 16,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#1E3C5A",
    marginBottom: 16,
  },
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileName: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  profileNumber: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
  },
  profileEmail: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  profileAction: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#305d7b",
    borderRadius: 12,
  },
  profileActionText: {
    marginRight: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  /** Section */
  section: {
    marginBottom: 16,
    backgroundColor: "#1E3C5A",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#a7a7a7",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  /** Row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingRight: 0,
    height: 50,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "500",
    color: "#fff",
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "500",
    color: "#8B8B8B",
    marginRight: 4,
  },
  /* Log Out */
  logoutContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E3C5A",
    borderRadius: 16,
    paddingVertical: 15,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 10,
  },
});