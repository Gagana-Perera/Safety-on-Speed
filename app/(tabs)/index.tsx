import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../themeContext';
import { Link } from 'expo-router';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager'; 
import { supabase } from '../../lib/superbase';

const CURRENT_USER_ID = 'a';
const LOCATION_TASK_NAME = 'a';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Task Manager Error:", error.message);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    
    if (locations && locations.length > 0) {
      const location = locations[0];
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      try {
        await supabase
          .from('live_locations' as any)
          .upsert({ 
            user_id: CURRENT_USER_ID, 
            latitude: lat, 
            longitude: lng, 
            updated_at: new Date().toISOString(),
            is_active: true
          }, { onConflict: 'user_id' }); 
      } catch (err) {
        console.error("Background Supabase Error:", err);
      }
    }
  }
});

export default function Index() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Safety on Speed
          </Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Stay safe, stay connected.
          </Text>
        </View>

        {/* Card 1 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Live Location
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            Your location is being tracked to keep you safe.
          </Text>
        </View>

        {/* Card 2 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Emergency Services
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            Quick access to emergency contacts and services.
          </Text>
          <Link href="/extra" style={{ color: theme.text, marginTop: 8 }}>
            View Services →
          </Link>
        </View>

        {/* Card 3 */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            News & Alerts
          </Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            Stay updated with the latest safety news in your area.
          </Text>
          <Link href="/news" style={{ color: theme.text, marginTop: 8 }}>
            View News →
          </Link>
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
    paddingTop: 60,
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
});