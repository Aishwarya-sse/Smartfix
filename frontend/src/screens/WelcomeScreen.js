import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  ImageBackground,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  Sparkles,
  MapPin,
  Trophy,
  ArrowRight,
  Check,
} from "lucide-react-native";
import { COLORS } from "../theme/colors";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Welcome to SmartFix",
    description:
      "The premium AI-powered platform to keep your city clean, safe, and beautiful.",
    icon: <Sparkles size={80} color={COLORS.primary} />,
  },
  {
    id: "2",
    title: "Report Issues Instantly",
    description:
      "Spot a pothole or garbage dump? Snap a photo and let our AI dispatch the right technicians.",
    icon: <MapPin size={80} color={COLORS.secondary} />,
  },
  {
    id: "3",
    title: "Earn Civic Rewards",
    description:
      "Track real-time progress, verify fixes, and earn points on the leaderboard for your contributions.",
    icon: <Trophy size={80} color="#f59e0b" />,
  },
];

export default function WelcomeScreen({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground 
        source={{ uri: "https://cdn.midjourney.com/dd3522a5-8c83-44b7-9cbb-92ab465767fc/0_3.png" }} 
        style={styles.backgroundImage}
      >
        <View style={styles.darkOverlay} />
        {/* Skip Button */}
        <View style={styles.header}>
          {currentIndex < SLIDES.length - 1 ? (
            <TouchableOpacity onPress={onComplete} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        <Animated.FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
        />

        {/* Footer */}
        <View style={styles.footer}>
          {/* Paginator */}
          <View style={styles.paginator}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 24, 8],
                extrapolate: "clamp",
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={i.toString()}
                  style={[styles.dot, { width: dotWidth, opacity }]}
                />
              );
            })}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={handleNext}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonText}>
                {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.70)', // Deep dark overlay so text is readable
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    alignItems: "flex-end",
    height: 80,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  slide: {
    width,
    alignItems: "center",
    padding: 30,
    paddingTop: height * 0.15,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === "ios" ? 40 : 30,
    alignItems: "center",
  },
  paginator: {
    flexDirection: "row",
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },
  actionButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    marginTop: 10,
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
});
