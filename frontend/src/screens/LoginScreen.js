import React, { useState, useContext } from "react";
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
  Image,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { COLORS } from "../theme/colors";
import { LogIn, Mail, Lock, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function LoginScreen({ onNavigateToSignup, onNavigateToOTP, onNavigateToForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("user"); // 'user' or 'partner'
  const { login, loading, error: authError } = useContext(AuthContext);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Please fill in all credentials.");
      return;
    }

    setErrorMessage(null);
    const result = await login(email, password);
    if (result && result.unverified) {
      onNavigateToOTP(result.email);
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
          {/* Brand Logo Spherical Concept */}
          <View style={styles.header}>
            <View style={styles.logoSphereOuter}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logoSphere}
              />
            </View>
            <Text style={styles.title}>Smart Fix</Text>
            <Text style={styles.subtitle}>Municipal Service Reporting App</Text>
          </View>

          {/* Dual-role Switcher Capsule */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "user" && styles.activeTab]}
              onPress={() => setActiveTab("user")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "user" && styles.activeTabText,
                ]}
              >
                Reporting Citizen
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "partner" && styles.activeTab]}
              onPress={() => setActiveTab("partner")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "partner" && styles.activeTabText,
                ]}
              >
                Service Partner
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {errorMessage || authError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>
                  {errorMessage || authError}
                </Text>
              </View>
            ) : null}

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

            <View style={styles.inputWrapper}>
              <Lock
                style={styles.inputIcon}
                stroke={COLORS.primary}
                size={16}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
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
              style={styles.forgotPasswordLink}
              onPress={onNavigateToForgot}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#a284f9', '#a284f9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.8 }}
                  style={styles.submitButton}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Login</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchLink}
              onPress={onNavigateToSignup}
            >
              <Text style={styles.switchLinkText}>
                Need an account?{" "}
                <Text style={styles.highlightText}>Sign up here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  header: {
    marginBottom: 40,
  },
  logoSphereOuter: {
    width: 64,
    height: 64,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoSphere: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  title: {
    color: COLORS.textDark,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 8,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.textDark,
    fontWeight: '700',
  },
  form: {
    marginTop: 0,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: '500',
  },
  loader: {
    marginVertical: 16,
  },
  buttonWrapper: {
    marginTop: 10,
    marginBottom: 24,
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLinkText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  highlightText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
  },
  eyeIconWrapper: {
    padding: 8,
    marginRight: -4,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
