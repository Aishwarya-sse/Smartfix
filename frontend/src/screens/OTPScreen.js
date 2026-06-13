import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { ShieldCheck, Mail, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function OTPScreen({ email, onNavigateBack }) {
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const { verifyOtp, loading, error: authError } = useContext(AuthContext);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    setErrorMessage(null);
    await verifyOtp(email, otp);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Floating Backdrop Glows */}
        <View style={[styles.glowBlob, styles.blob1]} />
        <View style={[styles.glowBlob, styles.blob2]} />

        <View style={styles.cardContainer}>
          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
            <ArrowLeft stroke={COLORS.textMuted} size={16} />
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <ShieldCheck stroke="#ffffff" size={26} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Enter OTP Code</Text>
            <Text style={styles.subtitle}>We have dispatched a 6-digit code to:</Text>
            <Text style={styles.emailHighlight}>{email}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errorMessage || authError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage || authError}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrapper}>
              <Mail style={styles.inputIcon} stroke={COLORS.primary} size={16} />
              <TextInput
                style={styles.otpInput}
                placeholder="0 0 0 0 0 0"
                placeholderTextColor={COLORS.textMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                letterSpacing={Platform.OS === 'web' ? 8 : 4}
                textAlign="center"
              />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : (
              <TouchableOpacity style={styles.buttonWrapper} onPress={handleVerify}>
                <LinearGradient
                  colors={COLORS.userBubble}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButton}
                >
                  <Text style={styles.submitButtonText}>Verify & Login</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.2
  },
  blob1: {
    width: 260,
    height: 260,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    top: '10%',
    left: '-10%',
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined
  },
  blob2: {
    width: 260,
    height: 260,
    backgroundColor: 'rgba(219, 39, 119, 0.12)',
    bottom: '10%',
    right: '-10%',
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 24,
    paddingVertical: 26,
    shadowColor: 'rgba(219, 39, 119, 0.04)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(30, 27, 75, 0.05)'
  },
  backText: {
    color: COLORS.textMuted,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700'
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600'
  },
  emailHighlight: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center'
  },
  form: {
    marginTop: 2
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 0.5,
    borderColor: COLORS.danger,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12.5,
    textAlign: 'center',
    fontWeight: '700'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(30, 27, 75, 0.04)',
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 52
  },
  inputIcon: {
    marginRight: 10
  },
  otpInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800'
  },
  loader: {
    marginVertical: 14
  },
  buttonWrapper: {
    marginBottom: 16
  },
  submitButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  }
});
