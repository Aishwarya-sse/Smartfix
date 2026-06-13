import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { COLORS } from "../theme/colors";
import {
  Mail,
  Lock,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

// Use same API_BASE_URL resolution as AuthContext
const API_BASE_URL = "https://smart-fix-frontend.vercel.app/api";

export default function ForgotPasswordScreen({ onNavigateBack, onLogin }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const requestOtp = async () => {
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to request OTP.");

      setStep(2);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!otp || !newPassword) {
      setErrorMessage("Please fill all fields.");
      return;
    }
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to reset password.");

      Alert.alert(
        "Password Reset Successful",
        "You can now login with your new password.",
        [{ text: "OK", onPress: onLogin }],
      );
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
            <ArrowLeft stroke={COLORS.textMuted} size={16} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <KeyRound size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? "Enter your email to receive a secure OTP to reset your password."
                : "Enter the OTP sent to your email and your new password."}
            </Text>
          </View>

          <View style={styles.form}>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <>
                <View style={styles.inputWrapper}>
                  <Mail
                    style={styles.inputIcon}
                    stroke={COLORS.primary}
                    size={16}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <TouchableOpacity
                  style={styles.buttonWrapper}
                  onPress={requestOtp}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#a284f9", "#a284f9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButton}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Send OTP</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputWrapper}>
                  <ShieldCheck
                    style={styles.inputIcon}
                    stroke={COLORS.primary}
                    size={16}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="6-Digit OTP Code"
                    placeholderTextColor={COLORS.textMuted}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Lock
                    style={styles.inputIcon}
                    stroke={COLORS.primary}
                    size={16}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconWrapper}
                  >
                    {showPassword ? (
                      <EyeOff stroke={COLORS.textMuted} size={18} />
                    ) : (
                      <Eye stroke={COLORS.textMuted} size={18} />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.buttonWrapper}
                  onPress={resetPassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#a284f9", "#a284f9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButton}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        Update Password
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: 40,
  },
  formContainer: { flex: 1, width: "100%" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  backText: {
    color: COLORS.textMuted,
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "700",
  },
  header: { alignItems: "center", marginBottom: 30 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(162, 132, 249, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: COLORS.textDark,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 22,
  },
  form: { marginTop: 2 },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: COLORS.textDark, fontSize: 15, fontWeight: "500" },
  loader: { marginVertical: 16 },
  buttonWrapper: { marginTop: 10, marginBottom: 24 },
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 56,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  eyeIconWrapper: {
    padding: 8,
    marginRight: -4,
  },
});
