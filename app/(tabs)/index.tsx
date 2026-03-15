import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../themeContext';
import {Link} from 'expo-router';

export default function Home() {
  const { theme } = useTheme();
  const [sosActive, setSosActive] = useState(false);

  const handleSOSPress = () => {
    setSosActive(!sosActive);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={{ padding: 16, gap: 12 }}>
      <Text>Welcome</Text>

      <Link href="/auth/sign-up" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Sign Up</Text>
      </Link>
      <Link href="/auth/login" asChild>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Login</Text>
      </Link>
    </View>
        
        {/* Header Area */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome!</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            This is the Home Screen.
          </Text>
        </View>

    <View style={[styles.emergencyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity 
        onPress={handleSOSPress}
        activeOpacity={0.7}
        style={[styles.emergencyButton, { backgroundColor: sosActive ? '#DC2626' : '#0F7CA5' }]}
      >
        <Text style={[styles.emergencyButtonText, { color: theme.text }]}>
          {sosActive ? 'ACTIVE' : 'SOS'}
        </Text>
      </TouchableOpacity>
    </View>

        {/* Example Card 1 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Dark Mode Test</Text>
          <Text style={[styles.cardText, { color: theme.icon }]}>
            If the toggle Dark Mode in your Profile, this card should turn dark grey.
          </Text>
        </View>

        {/* Example Card 2 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Team's Work</Text>
          <Text style={[styles.cardText, { color: theme.icon }]}>
            We can replace this file later with our real code.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60, // Space for status bar
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    // Shadow for iOS/Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emergencyContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emergencyButton: {
    paddingVertical: 30,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emergencyStatus: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
