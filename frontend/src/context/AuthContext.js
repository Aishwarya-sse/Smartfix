import React, { createContext, useState, useEffect } from "react";

// Safe cross-platform storage helper with fallbacks to avoid "Native module is null" crashes
const getSafeStorage = () => {
  let AsyncStorageInstance = null;
  try {
    AsyncStorageInstance =
      require("@react-native-async-storage/async-storage").default;
  } catch (e) {
    console.warn("AsyncStorage module could not be required:", e);
  }

  return {
    getItem: async (key) => {
      try {
        if (AsyncStorageInstance) {
          const val = await AsyncStorageInstance.getItem(key);
          if (val !== null) return val;
        }
      } catch (e) {
        console.warn(
          "AsyncStorage.getItem failed, using localStorage fallback:",
          e,
        );
      }
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {}
      return null;
    },
    setItem: async (key, value) => {
      try {
        if (AsyncStorageInstance) {
          await AsyncStorageInstance.setItem(key, value);
          return;
        }
      } catch (e) {
        console.warn(
          "AsyncStorage.setItem failed, using localStorage fallback:",
          e,
        );
      }
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {}
    },
    removeItem: async (key) => {
      try {
        if (AsyncStorageInstance) {
          await AsyncStorageInstance.removeItem(key);
          return;
        }
      } catch (e) {
        console.warn(
          "AsyncStorage.removeItem failed, using localStorage fallback:",
          e,
        );
      }
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {}
    },
  };
};

const safeStorage = getSafeStorage();

export const AuthContext = createContext();

import { Platform } from "react-native";

// Detect running platform to set proper API URL (localhost works on Web, but on mobile we need the local machine IP)
// For local testing, we fall back to localhost, but we will make it easily configurable!
const API_BASE_URL =
  Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.origin + "/api"
    : "https://smart-fix-frontend.vercel.app/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Auto login if saved token exists
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await safeStorage.getItem("user_token");
        const storedUser = await safeStorage.getItem("user_data");
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Error restoring session:", err);
      } finally {
        setIsRestoring(false);
      }
    };
    restoreSession();
  }, []);

  const register = async (
    name,
    email,
    password,
    role,
    partnerCategory = "other",
    phone = "",
    upiAddress = "",
    emergencyContact = "",
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          partnerCategory,
          phone,
          upiAddress,
          emergencyContact,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed");
      }

      await safeStorage.setItem("user_token", data.token);
      await safeStorage.setItem("user_data", JSON.stringify(data.user));

      setUser(data.user);
      setToken(data.token);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.unverified) {
          setLoading(false);
          return { unverified: true, email };
        }
        throw new Error(data.error || "Login failed");
      }

      await safeStorage.setItem("user_token", data.token);
      await safeStorage.setItem("user_data", JSON.stringify(data.user));

      setUser(data.user);
      setToken(data.token);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await safeStorage.removeItem("user_token");
      await safeStorage.removeItem("user_data");
    } catch (err) {
      console.error("Error clearing session:", err);
    }
    setUser(null);
    setToken(null);
    setIsOfflineMode(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isOfflineMode,
        isRestoring,
        apiBaseUrl: API_BASE_URL,
        register,
        verifyOtp,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
