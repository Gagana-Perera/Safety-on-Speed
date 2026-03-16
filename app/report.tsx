import { StyleSheet, Text, View, ScrollView } from 'react-native'
import React from 'react'
import BackButton from './backButton'
import { useTheme } from './themeContext'
import { BlurView } from 'expo-blur'

const report = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.modalOverlay}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.modalContent, { backgroundColor: 'rgba(53, 53, 53, 0.9)', borderColor: theme.border }]}>
        
        {/* Header containing BackButton and Title */}
        <View style={styles.header}>
          <BackButton color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>Report Issue</Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={{ color: theme.text }}>
            Report content goes here.
          </Text>
        </ScrollView>
        
      </View>
    </View>
  )
}

export default report

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  scrollContent: {
    flexGrow: 1,
  }
})
