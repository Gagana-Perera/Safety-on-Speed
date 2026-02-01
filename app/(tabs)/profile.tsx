import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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
} from "react-native";

export default function Profile() {
  const [form, setForm] = useState({
    darkMode: false,
    emailNotifications: false,
    pushNotifications: false,
    alertNotifications: false,
    dataPermission: false,
    locPermissions: false,
  });

  // Show a confirmation alert before user log out.
  const handleSignOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => console.log("User Logged Out"), //Replace with my Log out logic.
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f6f6" }}>
      <View style={styles.container}>
        <ScrollView>

          {/* ------------- User Profile Section ------------- */}

          <View style={styles.profile}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80",
              }}
              style={styles.profileAvatar}
            />

            <Text style={styles.profileName}>Shenal Arosha</Text>

            <Text style={styles.profileNumber}>0711155893</Text>

            <Text style={styles.profileEmail}>shenal@gmail.com</Text>

            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
            >
              <View style={styles.profileAction}>
                <Text style={styles.profileActionText}>Edit Profile</Text>

                <Feather color="#fff" name="edit" size={16} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ------------- Preferences Section ------------- */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <View style={styles.sectionBody}>
              {/* Language Selection Row */}
              <View style={[styles.rowWrapper, styles.rowFirst]}>
                <TouchableOpacity
                  onPress={() => {
                    // handle onPress
                  }}
                  style={styles.row}
                >
                  <View
                    style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                  >
                    <Feather color="#fff" name="globe" size={20} />
                  </View>

                  <Text style={styles.rowLabel}>Language</Text>

                  <View style={styles.rowSpacer} />

                  <Text style={styles.rowValue}>English</Text>

                  <Feather color="#C6C6C6" name="chevron-right" size={20} />
                </TouchableOpacity>
              </View>

              {/* Dark Mode Toggle */}

              <View style={styles.rowWrapper}>
                <View style={styles.row}>
                  <View
                    style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                  >
                    <Feather color="#fff" name="moon" size={20} />
                  </View>

                  <Text style={styles.rowLabel}>Dark Mode</Text>

                  <View style={styles.rowSpacer} />

                  <Switch
                    onValueChange={(darkMode) => setForm({ ...form, darkMode })}
                    value={form.darkMode}
                  />
                </View>
              </View>

              {/* Location Row */}

              <View style={styles.rowWrapper}>
                <TouchableOpacity
                  onPress={() => {
                    // handle onPress
                  }}
                  style={styles.row}
                >
                  <View
                    style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                  >
                    <Feather color="#fff" name="navigation" size={20} />
                  </View>

                  <Text style={styles.rowLabel}>Location</Text>

                  <View style={styles.rowSpacer} />

                  <Text style={styles.rowValue}>Los Angeles, CA</Text>

                  <Feather color="#C6C6C6" name="chevron-right" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ------------- Notification & Permission Section ------------- */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Notifications & Permissions
              </Text>

              <View style={styles.sectionBody}>
                {/* Email Notifications */}

                <View style={[styles.rowWrapper, styles.rowFirst]}>
                  <View style={styles.row}>
                    <View
                      style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                    >
                      <Feather color="#fff" name="at-sign" size={20} />
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
                </View>

                {/* Push Notifications */}

                <View style={styles.rowWrapper}>
                  <View style={styles.row}>
                    <View
                      style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                    >
                      <Feather color="#fff" name="bell" size={20} />
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
                </View>

                {/* Alert Notifications */}

                <View style={styles.rowWrapper}>
                  <View style={styles.row}>
                    <View
                      style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                    >
                      <Feather color="#fff" name="alert-triangle" size={20} />
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
                </View>

                {/* Data Permission */}

                <View style={styles.rowWrapper}>
                  <View style={styles.row}>
                    <View
                      style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                    >
                      <Feather color="#fff" name="file-text" size={20} />
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
                </View>

                {/* Camera and Audio Permission */}

                <View style={styles.rowWrapper}>
                  <View style={styles.row}>
                    <View
                      style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                    >
                      <Feather color="#fff" name="camera" size={20} />
                    </View>

                    <Text style={styles.rowLabel}>Camera & Audio Access</Text>

                    <View style={styles.rowSpacer} />

                    <Switch
                      onValueChange={(dataPermission) =>
                        setForm({ ...form, dataPermission })
                      }
                      value={form.dataPermission}
                    />
                  </View>
                </View>

                {/* Live Location Permission */}

                <View style={styles.rowWrapper}>
                  <View style={styles.row}>
                    <View
                      style={[styles.rowIcon, { backgroundColor: "#5FC9F1" }]}
                    >
                      <Feather color="#fff" name="map-pin" size={20} />
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
              </View>
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
    paddingHorizontal: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  /** Profile */
  profile: {
    padding: 50,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#002857",
    borderBottomWidth: 1,
    borderColor: "#e3e3e3",
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 9999,
  },
  profileName: {
    marginTop: 12,
    fontFamily: "Arial",
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  profileNumber: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: "Verdana",
    fontWeight: "600",
    color: "#fff",
  },
  profileEmail: {
    marginTop: 8,
    fontFamily: "Arial",
    fontSize: 16,
    fontWeight: "400",
    color: "#fff",
  },
  profileAction: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007bff",
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
    paddingTop: 12,
  },
  sectionTitle: {
    marginVertical: 8,
    marginHorizontal: 24,
    fontSize: 14,
    fontWeight: "600",
    color: "#a7a7a7",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionBody: {
    paddingLeft: 24,
    backgroundColor: "#002747",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e3e3e3",
  },
  /** Row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingRight: 16,
    height: 50,
  },
  rowWrapper: {
    borderTopWidth: 1,
    borderColor: "#e3e3e3",
  },
  rowFirst: {
    borderTopWidth: 0,
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
    paddingHorizontal: 14,
    marginTop: 10, // Space after the last setting row
    marginBottom: 10, // Space at the very bottom of the scroll
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1DB954",
    borderRadius: 12,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#ffe5e5",
    // Modern Shadow
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 10,
  },
});
