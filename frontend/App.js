import React, { useContext, useState } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { COLORS } from './src/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

// Inject global web styles to remove browser outlines on inputs and buttons on laptops/desktops
if (Platform.OS === 'web') {
  try {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
      input, textarea, select, button, [role="button"], [tabindex="0"] {
        outline: none !important;
        outline-width: 0 !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
  } catch (e) {
    console.warn('Failed to inject global web styles:', e);
  }
}

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import OTPScreen from './src/screens/OTPScreen';
import UserHomeScreen from './src/screens/UserHomeScreen';
import PartnerHomeScreen from './src/screens/PartnerHomeScreen';
import AdminHomeScreen from './src/screens/AdminHomeScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AppContent() {
  const { user, token, isRestoring } = useContext(AuthContext);
  const isDesktop = Platform.OS === 'web' && Dimensions.get('window').width >= 768;
  const [currentScreen, setCurrentScreen] = useState(isDesktop ? 'login' : 'welcome'); // 'welcome', 'login', 'signup', 'otp', 'forgot'
  const [otpEmail, setOtpEmail] = useState('');
  const [isAppReady, setIsAppReady] = useState(false);

  React.useEffect(() => {
    const checkWelcome = async () => {
      try {
        // If it's a web browser on a laptop/desktop, bypass Welcome Screen immediately
        if (isDesktop) {
          setCurrentScreen('login');
          return;
        }

        const hasSeen = await AsyncStorage.getItem('hasSeenWelcome');
        if (hasSeen === 'true') {
          setCurrentScreen('login');
        }
      } catch (e) {
        console.warn('Error reading welcome state');
      } finally {
        setIsAppReady(true);
      }
    };
    if (!isRestoring) {
      checkWelcome();
    }
  }, [isRestoring]);

  if (isRestoring || !isAppReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f3fe' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const renderAuthScreen = () => {
    if (currentScreen === 'welcome') {
      return (
        <WelcomeScreen 
          onComplete={async () => {
            try {
              await AsyncStorage.setItem('hasSeenWelcome', 'true');
            } catch(e){}
            setCurrentScreen('login');
          }} 
        />
      );
    }
    if (currentScreen === 'login') {
      return (
        <LoginScreen
          onNavigateToSignup={() => setCurrentScreen('signup')}
          onNavigateToOTP={(email) => {
            setOtpEmail(email);
            setCurrentScreen('otp');
          }}
          onNavigateToForgot={() => setCurrentScreen('forgot')}
        />
      );
    }
    if (currentScreen === 'forgot') {
      return (
        <ForgotPasswordScreen
          onNavigateBack={() => setCurrentScreen('login')}
          onLogin={() => setCurrentScreen('login')}
        />
      );
    }
    if (currentScreen === 'signup') {
      return (
        <SignupScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
          onNavigateToOTP={(email) => {
            setOtpEmail(email);
            setCurrentScreen('otp');
          }}
        />
      );
    }
    return (
      <OTPScreen
        email={otpEmail}
        onNavigateBack={() => setCurrentScreen('login')}
      />
    );
  };

  const renderHomeScreen = () => {
    if (user?.role === 'admin') {
      return <AdminHomeScreen />;
    }
    if (user?.role === 'partner') {
      return <PartnerHomeScreen />;
    }
    return <UserHomeScreen />;
  };

  // 1. Unauthenticated Navigation Routing
  if (!token) {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webContainer}>
          <StatusBar style="dark" />
          <LinearGradient
            colors={['#fdf4f9', '#f2f3fe', '#ecf1ff']}
            style={styles.webGradient}
          >
            <View style={styles.webAuthFrame}>
              {renderAuthScreen()}
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#fdf4f9', '#f2f3fe', '#ecf1ff']}
          style={styles.gradientContainer}
        >
          {renderAuthScreen()}
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // 2. Authenticated Dashboard Gateways based on Roles
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#fdf4f9', '#f2f3fe', '#ecf1ff']}
          style={styles.webGradient}
        >
          <View style={styles.webFrame}>
            {renderHomeScreen()}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#fdf4f9', '#f2f3fe', '#ecf1ff']}
        style={styles.gradientContainer}
      >
        {renderHomeScreen()}
      </LinearGradient>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fa',
    paddingTop: Platform.OS === 'android' ? 30 : 0
  },
  gradientContainer: {
    flex: 1
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    width: '100%',
    height: '100vh',
    justifyContent: 'center',
    alignItems: 'center'
  },
  webGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  webFrame: {
    width: '95%',
    maxWidth: 1280,
    height: '92vh',
    maxHeight: 900,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)'
  },
  webAuthFrame: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 10
  }
});
