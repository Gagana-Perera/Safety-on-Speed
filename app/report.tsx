import { BlurView } from 'expo-blur'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getCurrentUser } from '../lib/auth'
import { saveReport } from '../lib/report'
import BackButton from './backButton'
import { useTheme } from './themeContext'


const report = () => {
  const { theme } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<'VERIFY' | 'DETAILS' | 'SAFETY_CHECK' | 'RESOLUTION'>('VERIFY');
  const [verification, setVerification] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState<string | null>(null);
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);


  const fadeAnim = useRef(new Animated.Value(1)).current;

  const transitionTo = (nextStep: 'VERIFY' | 'DETAILS' | 'SAFETY_CHECK' | 'RESOLUTION') => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleClose = () => {
    router.back();
  };

  const handleFinishReport = async () => {

    try {
      setLoading(true);
      const user = await getCurrentUser().catch(() => null);

      await saveReport({
        verification: verification || "Real Incident",
        incident_type: incidentType || "None",
        safety_check: isSafe ? "Safe" : "Not Safe",
        user_id: user?.id
      });

      handleClose();
    } catch (error) {
      console.error("Failed to save report:", error);
      alert("Failed to save report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const incidentOptions = [
    "Verbal Abuse",
    "Physical Contact",
    "Stalking",
    "Unwanted Attention",
    "Other"
  ];

  const legalAdvice: Record<string, string> = {
    "Verbal Abuse": "Document the time, location, and details of the abuse. If it's persistent, report it to the local authorities as harassment.",
    "Physical Contact": "Seek a safe place immediately. Note any witnesses and report the incident to the police as soon as possible. File an assault report.",
    "Stalking": "Keep a detailed log of all encounters. Do not engage with the person. Inform your friends, family, and local law enforcement about the situation.",
    "Unwanted Attention": "Firmly state your boundaries if safe to do so. If the behavior continues, keep a record and report to the relevant authorities or building security.",
    "Other": "Ensure your immediate safety. Document everything that happened and seek professional legal or support services to discuss your options."
  };

  const getBackButtonAction = () => {
    if (step === 'DETAILS') return () => transitionTo('VERIFY');
    if (step === 'SAFETY_CHECK') return () => transitionTo('DETAILS');
    if (step === 'RESOLUTION') return () => transitionTo('SAFETY_CHECK');
    return handleClose;
  };

  return (
    <View style={styles.modalOverlay}>
      <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />

      <Animated.View style={[
        styles.modalContent,
        {
          backgroundColor: 'rgba(5, 5, 5, 0.86)',
          borderColor: theme.border,
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}>

        {/* Header */}
        <View style={styles.header}>

          <BackButton color={theme.text} onPress={getBackButtonAction()} />

          <Text style={[styles.title, { color: theme.text }]}>
            {step === 'VERIFY' ? 'Verify Incident' :
              step === 'DETAILS' ? 'Incident Details' :
                step === 'SAFETY_CHECK' ? 'Safety Check' : 'Resolution'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step === 'VERIFY' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.questionText, { color: theme.text }]}>
                Was this a real incident or a mistake?
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#FF4444' }]}
                onPress={() => {
                  setVerification('Real Incident');
                  transitionTo('DETAILS');
                }}
              >
                <Text style={styles.buttonText}>Real Incident</Text>

              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>It was a mistake</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'DETAILS' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.questionText, { color: theme.text }]}>
                What kind of harassment did you face?
              </Text>

              {incidentOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    {
                      borderColor: incidentType === option ? '#FF4444' : theme.border,
                      backgroundColor: incidentType === option ? 'rgba(255, 68, 68, 0.1)' : 'transparent'
                    }
                  ]}
                  onPress={() => setIncidentType(option)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: incidentType === option ? '#FF4444' : theme.text }
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: incidentType ? '#FF4444' : '#555',
                    marginTop: 20
                  }
                ]}
                disabled={!incidentType}
                onPress={() => transitionTo('SAFETY_CHECK')}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'SAFETY_CHECK' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.questionText, { color: theme.text }]}>
                Are you safe and secure right now?
              </Text>
              <Text style={[styles.subText, { color: theme.text, opacity: 0.7 }]}>
                And are you relieved from the distressing situation?
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#28A745' }]}
                onPress={() => {
                  setIsSafe(true);
                  transitionTo('RESOLUTION');
                }}
              >
                <Text style={styles.buttonText}>Yes, I am Safe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#FF4444' }]}
                onPress={() => {
                  setIsSafe(false);
                  transitionTo('RESOLUTION');
                }}
              >
                <Text style={styles.buttonText}>No, I am still in danger</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'RESOLUTION' && (
            <View style={styles.stepContainer}>
              {!isSafe ? (
                <>
                  <View style={styles.warningContainer}>
                    <Text style={{ fontSize: 40 }}>⚠️</Text>
                    <Text style={[styles.questionText, { color: '#FF4444', textAlign: 'center', marginTop: 10 }]}>
                      Immediate Action Required
                    </Text>
                  </View>
                  <Text style={[styles.subText, { color: theme.text, textAlign: 'center' }]}>
                    Please use the emergency button immediately to seek help to call 911.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#FF0000', marginTop: 10 }]}
                  >
                    <Text style={[styles.buttonText, { fontSize: 18 }]}>EMERGENCY</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>

                  <Text style={[styles.questionText, { color: theme.text, textAlign: 'center' }]}>
                    Recommended Legal Actions
                  </Text>
                  <View style={[styles.adviceCard, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: theme.border }]}>
                    <Text style={[styles.subText, { color: theme.text, fontWeight: '700', marginBottom: 5 }]}>
                      Incident: {incidentType}
                    </Text>
                    <Text style={[styles.subText, { color: theme.text, opacity: 0.9, lineHeight: 22 }]}>
                      {incidentType ? legalAdvice[incidentType] : ""}
                    </Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: loading ? '#555' : '#007AFF',
                    marginTop: 20
                  }
                ]}
                onPress={handleFinishReport}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Saving...' : 'Finish Report'}
                </Text>
              </TouchableOpacity>

            </View>
          )}
        </ScrollView>

      </Animated.View>
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
    minHeight: '60%',
    maxHeight: '80%',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 25,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 15,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    gap: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 26,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  successIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  subText: {
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  warningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 10,
  },
  adviceCard: {
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 10,
  }
})
