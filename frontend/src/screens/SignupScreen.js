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
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { COLORS } from "../theme/colors";
import {
  User,
  Mail,
  Lock,
  ShieldAlert,
  ArrowLeft,
  Wrench,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const SERVICE_CATEGORIES = [
  { id: "garbage", label: "️ Garbage" },
  { id: "water", label: " Water Leak" },
  { id: "electricity", label: " Electric" },
  { id: "roads", label: "️ Potholes" },
  { id: "other", label: "️ Other" },
];

export default function SignupScreen({ onNavigateToLogin, onNavigateToOTP }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [upiAddress, setUpiAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [role, setRole] = useState("user"); // 'user' or 'partner'
  const [partnerCategory, setPartnerCategory] = useState("garbage");
  const [errorMessage, setErrorMessage] = useState(null);
  const { register, loading, error: authError } = useContext(AuthContext);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setErrorMessage("Please fill in all signup details.");
      return;
    }

    if (role === "partner" && !phone) {
      setErrorMessage("Please provide a contact phone number.");
      return;
    }

    setErrorMessage(null);
    const result = await register(
      name,
      email,
      password,
      role,
      partnerCategory,
      phone,
      upiAddress,
      emergencyContact,
    );
    if (result) {
      onNavigateToOTP(email);
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
          {/* Back Action */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onNavigateToLogin}
          >
            <ArrowLeft stroke={COLORS.textMuted} size={16} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Join Smart Fix</Text>
            <Text style={styles.subtitle}>
              Help maintain and restore your city
            </Text>
          </View>

          {/* Role selection tab row */}
          <View style={styles.roleToggleWrapper}>
            <Text style={styles.label}>Choose Account Role</Text>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, role === "user" && styles.activeTab]}
                onPress={() => setRole("user")}
              >
                <Text
                  style={[
                    styles.tabText,
                    role === "user" && styles.activeTabText,
                  ]}
                >
                  Citizen User
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, role === "partner" && styles.activeTab]}
                onPress={() => setRole("partner")}
              >
                <Text
                  style={[
                    styles.tabText,
                    role === "partner" && styles.activeTabText,
                  ]}
                >
                  Service Partner
                </Text>
              </TouchableOpacity>
            </View>
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
              <User
                style={styles.inputIcon}
                stroke={COLORS.primary}
                size={16}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

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

            {/* Phone Number Input for Partners */}
            {role === "partner" && (
              <>
                <View style={styles.inputWrapper}>
                  <Phone
                    style={styles.inputIcon}
                    stroke={COLORS.primary}
                    size={16}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Contact Phone Number"
                    placeholderTextColor={COLORS.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Wrench
                    style={styles.inputIcon}
                    stroke={COLORS.primary}
                    size={16}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="UPI Address (e.g. name@upi)"
                    placeholderTextColor={COLORS.textMuted}
                    value={upiAddress}
                    onChangeText={setUpiAddress}
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Phone
                    style={styles.inputIcon}
                    stroke={COLORS.primary}
                    size={16}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Emergency Contact Phone"
                    placeholderTextColor={COLORS.textMuted}
                    value={emergencyContact}
                    onChangeText={setEmergencyContact}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            {/* Specialized categories for partners */}
            {role === "partner" && (
              <View style={styles.partnerOptions}>
                <View style={styles.partnerHeader}>
                  <Wrench
                    stroke={COLORS.secondary}
                    size={14}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.partnerLabel}>Select Work Specialty</Text>
                </View>
                <View style={styles.categoriesContainer}>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryBadge,
                        partnerCategory === cat.id &&
                          styles.activeCategoryBadge,
                      ]}
                      onPress={() => setPartnerCategory(cat.id)}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          partnerCategory === cat.id &&
                            styles.activeCategoryBadgeText,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.partnerHint}>
                  System registers partner account and binds default localized
                  coordinate feeds.
                </Text>
              </View>
            )}

              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={handleSignup}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#a284f9", "#a284f9"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButton}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      Generate Account OTP
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchLink}
              onPress={onNavigateToLogin}
            >
              <Text style={styles.switchLinkText}>
                Already registered?{" "}
                <Text style={styles.highlightText}>Log in</Text>
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
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
    width: "100%",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 16,
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
  header: {
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
    marginTop: 6,
    fontWeight: "600",
  },
  roleToggleWrapper: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  activeTabText: {
    color: COLORS.textDark,
    fontWeight: "700",
  },
  form: {
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: "500",
  },
  partnerOptions: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  partnerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  partnerLabel: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: "700",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeCategoryBadge: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(162, 132, 249, 0.1)",
  },
  categoryBadgeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  activeCategoryBadgeText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  partnerHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
  },
  loader: {
    marginVertical: 16,
  },
  buttonWrapper: {
    marginTop: 8,
    marginBottom: 24,
  },
  submitButton: {
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
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  switchLink: {
    alignItems: "center",
    paddingVertical: 10,
  },
  switchLinkText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  highlightText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  eyeIconWrapper: {
    padding: 8,
    marginRight: -4,
  },
});
