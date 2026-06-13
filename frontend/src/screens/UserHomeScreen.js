import React, { useState, useEffect, useContext, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  Modal,
  Animated,
  Alert,
  RefreshControl,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { COLORS, GRADIENTS } from "../theme/colors";
import {
  Sparkles,
  Send,
  MapPin,
  User,
  MessageSquareCode,
  Clock,
  ShieldAlert,
  ArrowRight,
  Bell,
  ChevronLeft,
  Paperclip,
  Mic,
  MoreVertical,
  ThumbsUp,
  Volume2,
  RefreshCw,
  Bot,
  Trophy,
  Settings,
  BellRing,
  BarChart2,
  Award,
  Menu,
  Heart,
  MessageCircle,
  Plus,
  Share2,
  Image as ImageIcon,
  Video as VideoIcon,
  Star,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import LeafletMap from "../components/LeafletMap";
import * as Speech from "expo-speech";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";

const FormattedText = ({ text, style }) => {
  if (!text) return null;
  // Strip raw JSON blocks
  let cleanText = text.replace(/```(json)?[sS]*?```/gi, "");
  // Strip out curly brace JSON garbage at the end if it accidentally bled through
  cleanText = cleanText.replace(/\{[^{}]*"action"\s*:[^{}]*\}/g, "");

  const parts = cleanText.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text
              key={index}
              style={[{ fontWeight: "900", color: COLORS.primary }]}
            >
              {part.replace(/\*\*/g, "")}
            </Text>
          );
        }
        return <Text key={index}>{part.replace(/\*/g, "")}</Text>;
      })}
    </Text>
  );
};

// Premium animated like button component with feedback bounce

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AnimatedLikeButton = ({ isLiked, onPress }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.4,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[styles.bubbleActionBtn, isLiked && styles.likedActionBtn]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <ThumbsUp stroke={isLiked ? "#ffffff" : COLORS.textMuted} size={11} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Premium animated speech button component with bounce scale
const AnimatedSpeechButton = ({ isSpeaking, onPress }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.3,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[styles.bubbleActionBtn, isSpeaking && styles.speakingActionBtn]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Volume2 stroke={isSpeaking ? "#ffffff" : COLORS.textMuted} size={11} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const SoundBarWave = ({
  isPlaying,
  volume = -2,
  realtimeSessionState = "idle",
}) => {
  const anims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const activeLoopsRef = useRef([]);

  useEffect(() => {
    // Clear and stop any active loops
    activeLoopsRef.current.forEach((loop) => loop.stop());
    activeLoopsRef.current = [];

    if (isPlaying) {
      if (realtimeSessionState === "listening") {
        // Voice-reactive mode: scale waves directly based on the live volume metering (-2 to 10)
        // Map volume (-2 to 10) to a scale factor (0.3 to 7)
        const baseScale = Math.max(0.3, Math.min(7.0, (volume + 2) / 1.7));

        anims.forEach((anim, index) => {
          const offset = 0.4 + Math.random() * 0.9;
          const targetScale = Math.max(0.3, baseScale * offset);

          Animated.spring(anim, {
            toValue: targetScale,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }).start();
        });
      } else {
        // Thinking or Speaking mode: run fluid, beautiful synthetic waves
        const loops = anims.map((anim, index) => {
          const delay = index * 60;
          const loop = Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(anim, {
                toValue: 3.2 + Math.random() * 3.2,
                duration: 300 + Math.random() * 200,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0.6 + Math.random() * 0.6,
                duration: 300 + Math.random() * 200,
                useNativeDriver: true,
              }),
            ]),
          );
          loop.start();
          return loop;
        });
        activeLoopsRef.current = loops;
      }
    } else {
      // Idle state: return to calm, subtle mini bars
      anims.forEach((anim) => {
        Animated.spring(anim, {
          toValue: 0.25,
          friction: 6,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      activeLoopsRef.current.forEach((loop) => loop.stop());
    };
  }, [isPlaying, realtimeSessionState, volume]);

  return (
    <View style={styles.soundWaveWrapper}>
      {anims.map((anim, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.soundBarItem,
            {
              transform: [{ scaleY: anim }],
              backgroundColor: idx % 2 === 0 ? "#db2777" : "#a855f7",
            },
          ]}
        />
      ))}
    </View>
  );
};

const getStepStatus = (status, stepNumber) => {
  const normalizedStatus = (status || "").toLowerCase();

  if (normalizedStatus === "pending") {
    if (stepNumber === 1) return "active";
    return "pending";
  }

  if (["assigned", "escalated"].includes(normalizedStatus)) {
    if (stepNumber < 2) return "completed";
    if (stepNumber === 2) return "active";
    return "pending";
  }

  if (normalizedStatus === "scheduled") {
    if (stepNumber < 3) return "completed";
    if (stepNumber === 3) return "active";
    return "pending";
  }

  if (normalizedStatus === "in progress") {
    if (stepNumber < 4) return "completed";
    if (stepNumber === 4) return "active";
    return "pending";
  }

  if (normalizedStatus === "resolved") {
    if (stepNumber < 6) return "completed";
    if (stepNumber === 6) return "active";
    return "pending";
  }

  if (normalizedStatus === "done") {
    return "completed";
  }

  return "pending";
};

const getActiveStepNumber = (status) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "pending") return 1;
  if (["assigned", "escalated"].includes(normalized)) return 2;
  if (normalized === "scheduled") return 3;
  if (normalized === "in progress") return 4;
  if (normalized === "resolved") return 5;
  if (normalized === "done") return 6;
  return 1;
};

const getCategoryTheme = (cat) => {
  const normalized = (cat || "").toLowerCase();
  switch (normalized) {
    case "garbage":
      return {
        bgGlow: "rgba(219, 39, 119, 0.03)",
        borderGlow: "rgba(219, 39, 119, 0.1)",
        color: COLORS.primary, // pink
        textBg: "rgba(219, 39, 119, 0.08)",
        label: "Garbage Clearance",
      };
    case "roads":
      return {
        bgGlow: "rgba(168, 85, 247, 0.03)",
        borderGlow: "rgba(168, 85, 247, 0.1)",
        color: COLORS.secondary, // purple
        textBg: "rgba(168, 85, 247, 0.08)",
        label: "Pothole & Roads",
      };
    case "water":
      return {
        bgGlow: "rgba(6, 182, 212, 0.03)",
        borderGlow: "rgba(6, 182, 212, 0.1)",
        color: "#06b6d4", // cyan
        textBg: "rgba(6, 182, 212, 0.08)",
        label: "Water & Logs",
      };
    case "electricity":
      return {
        bgGlow: "rgba(245, 158, 11, 0.03)",
        borderGlow: "rgba(245, 158, 11, 0.1)",
        color: "#f59e0b", // orange
        textBg: "rgba(245, 158, 11, 0.08)",
        label: "Electricity Grid",
      };
    default:
      return {
        bgGlow: "rgba(107, 114, 128, 0.03)",
        borderGlow: "rgba(107, 114, 128, 0.1)",
        color: "#6b7280", // gray
        textBg: "rgba(107, 114, 128, 0.08)",
        label: "Civic Issue",
      };
  }
};

export default function UserHomeScreen() {
  const { user, token, logout, apiBaseUrl, isOfflineMode } =
    useContext(AuthContext);

  // Group all component state declarations at the top to prevent initialization reference errors
  const [userLat, setUserLat] = useState(null);
  const [userZone, setUserZone] = useState("Detecting...");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [activeReqCategory, setActiveReqCategory] = useState("other");
  const [activeReqSummary, setActiveReqSummary] = useState("");
  const [activeReqTitle, setActiveReqTitle] = useState("");
  const [userLng, setUserLng] = useState(null);
  const [messages, setMessages] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [inputText, setInputText] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [userRefreshing, setUserRefreshing] = useState(false);
  const [mediaPosts, setMediaPosts] = useState([]);
  const [mediaText, setMediaText] = useState("");
  const [mediaImage, setMediaImage] = useState(null);
  const [mediaVideo, setMediaVideo] = useState(null);
  const [mediaCommentsVisible, setMediaCommentsVisible] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [mediaLoading, setMediaLoading] = useState(false);
  const [currentView, setCurrentView] = useState("chat");
  const [activeBot, setActiveBot] = useState("smartfix"); // 'smartfix' (reporting), 'analyst' (trends), 'human' (escalation)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [likedMessages, setLikedMessages] = useState({});
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en"); // 'en', 'ta', 'hi', 'te'
  const [realtimeSessionState, setRealtimeSessionState] = useState("idle"); // 'idle', 'listening', 'processing', 'speaking'
  const [userCaption, setUserCaption] = useState("");
  const [aiCaption, setAiCaption] = useState("");
  const [activePopupCard, setActivePopupCard] = useState(null); // null, 'map', 'history', 'dispatch'
  const [volume, setVolume] = useState(-2);
  const [ticketImage, setTicketImage] = useState(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    // Fetch live leaderboard data from Database
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/auth/leaderboard`);
        if (res.ok) {
          const data = await res.json();

          // Inject dynamic pts for the current logged-in user if they exist in the DB list
          const currentName = user?.name?.split(" ")[0] || "You";
          const myIndex = data.findIndex(
            (u) => u.name.includes(currentName) || u.name === user?.name,
          );
          if (myIndex !== -1) {
            data[myIndex].pts = myCivicPoints;
            data[myIndex].badge = myBadge;
          } else {
            data.push({
              name: currentName,
              pts: myCivicPoints,
              badge: myBadge,
            });
          }

          setLeaderboardData(data.sort((a, b) => b.pts - a.pts));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLeaderboard();
  }, [myRequests.length]);

  // Dynamic Translation Engine
  const t = (enStr) => {
    if (selectedLanguage === "ta") {
      const ta = {
        "Civic Dashboard": "குடிமக்கள் டாஷ்போர்டு",
        "Issue Tracker": "பிரச்சனை கண்காணிப்பு",
        "App Settings": "பயன்பாட்டு அமைப்புகள்",
        "Civic Leaderboard": "தரவரிசை",
        Notifications: "அறிவிப்புகள்",
        "AI Assistant Chat": "AI உதவியாளர்",
        "Live City Operations & Contribution Scorecard":
          "நகர செயல்பாடுகள் மற்றும் மதிப்பெண்கள்",
        "Top contributors in": "சிறந்த பங்களிப்பாளர்கள்:",
        "Customize your SmartFix experience.":
          "உங்கள் SmartFix ஐ தனிப்பயனாக்கவும்.",
      };
      return ta[enStr] || enStr;
    }
    if (selectedLanguage === "hi") {
      const hi = {
        "Civic Dashboard": "नागरिक डैशबोर्ड",
        "Issue Tracker": "समस्या ट्रैकर",
        "App Settings": "ऐप सेटिंग्स",
        "Civic Leaderboard": "लीडरबोर्ड",
        Notifications: "सूचनाएं",
        "AI Assistant Chat": "AI सहायक",
        "Live City Operations & Contribution Scorecard": "लाइव सिटी ऑपरेशंस",
        "Top contributors in": "शीर्ष योगदानकर्ता:",
        "Customize your SmartFix experience.": "अपना SmartFix अनुकूलित करें।",
      };
      return hi[enStr] || enStr;
    }
    if (selectedLanguage === "te") {
      const te = {
        "Civic Dashboard": "డాష్‌బోర్డ్",
        "Issue Tracker": "ఇష్యూ ట్రాకర్",
        "App Settings": "సెట్టింగ్స్",
        "Civic Leaderboard": "లీడర్‌బోర్డ్",
        Notifications: "నోటిఫికేషన్‌లు",
        "AI Assistant Chat": "AI అసిస్టెంట్",
        "Live City Operations & Contribution Scorecard": "సిటీ ఆపరేషన్స్",
        "Top contributors in": "టాప్ కంట్రిబ్యూటర్స్:",
        "Customize your SmartFix experience.": "మీ SmartFixని కస్టమైజ్ చేయండి.",
      };
      return te[enStr] || enStr;
    }
    return enStr;
  };

  useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync();
    })();
  }, []);

  const handleRefresh = async () => {
    setUserRefreshing(true);
    await fetchMyRequests();
    setUserRefreshing(false);
  };

  const myCivicPoints = 150 + (myRequests || []).length * 50;
  const myBadge =
    myCivicPoints >= 1000
      ? "Ruby"
      : myCivicPoints >= 800
        ? "Platinum"
        : myCivicPoints >= 600
          ? "Diamond"
          : myCivicPoints >= 400
            ? "Gold"
            : myCivicPoints >= 200
              ? "Silver"
              : "Bronze";
  const ptsToNext =
    myBadge === "Ruby"
      ? 0
      : myBadge === "Platinum"
        ? 1000 - myCivicPoints
        : myBadge === "Diamond"
          ? 800 - myCivicPoints
          : myBadge === "Gold"
            ? 600 - myCivicPoints
            : myBadge === "Silver"
              ? 400 - myCivicPoints
              : 200 - myCivicPoints;

  const activeTicketsCount = (myRequests || []).filter((r) => {
    const s = (r.status || "").toLowerCase();
    return s !== "resolved" && s !== "done";
  }).length;

  const resolvedTicketsCount = (myRequests || []).filter((r) => {
    const s = (r.status || "").toLowerCase();
    return s === "resolved" || s === "done";
  }).length;

  // Dynamic Civic Health Score
  const civicHealthScore = Math.max(
    50,
    Math.min(100, 100 - activeTicketsCount * 5 + resolvedTicketsCount * 2),
  );

  const getCategorySLARate = (category) => {
    const catRequests = (myRequests || []).filter(
      (r) => (r.category || "").toLowerCase() === category.toLowerCase(),
    );
    if (catRequests.length === 0) {
      return 0; // If no data found, put 0%
    }
    const resolvedCat = catRequests.filter((r) => {
      const normStatus = (r.status || "").toLowerCase();
      return normStatus === "resolved" || normStatus === "done";
    }).length;
    return Math.round((resolvedCat / catRequests.length) * 100);
  };

  const garbageSLA = getCategorySLARate("garbage");
  const roadSLA = getCategorySLARate("roads");
  const waterSLA = getCategorySLARate("water");

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour ago`;
    return date.toLocaleDateString();
  };

  const generateDynamicNotifications = () => {
    const list = [];
    (myRequests || []).forEach((req) => {
      const shortDesc =
        req.description && req.description.length > 45
          ? req.description.substring(0, 45) + "..."
          : req.description;

      // 1. Ticket Created Notification
      list.push({
        id: `created-${req._id}`,
        title: "Ticket Created",
        description: `Your issue "${shortDesc}" has been successfully logged under ${req.category.toUpperCase()} category.`,
        time: new Date(req.createdAt),
        type: "info",
      });

      // 2. Civic Points Notification
      list.push({
        id: `points-${req._id}`,
        title: "Civic Points Earned",
        description: `You received +50 PTS for logging the verified ${req.category} report!`,
        time: new Date(req.createdAt),
        type: "success",
      });

      // 3. Ticket Assigned Notification
      if (req.partner) {
        const partnerName =
          typeof req.partner === "object"
            ? req.partner.name
            : "Municipal Partner";
        list.push({
          id: `assigned-${req._id}`,
          title: "Ticket Assigned",
          description: `Your issue "${shortDesc}" has been assigned to technician ${partnerName}. Accepting job now.`,
          time: req.assignedAt
            ? new Date(req.assignedAt)
            : new Date(req.createdAt),
          type: "assigned",
        });
      }

      // 4. Ticket Resolved Notification
      if ((req.status || "").toLowerCase() === "resolved") {
        list.push({
          id: `resolved-${req._id}`,
          title: "Ticket Resolved",
          description: `Outstanding! Your issue "${shortDesc}" has been completely resolved by our partners.`,
          time: req.resolvedAt
            ? new Date(req.resolvedAt)
            : new Date(req.updatedAt),
          type: "resolved",
        });
      }
    });

    return list.sort((a, b) => b.time - a.time);
  };

  const dynamicNotifications = generateDynamicNotifications();

  const getHealthLabelText = (score, areaName) => {
    const cleanArea = areaName;
    if (score >= 90) {
      return `Outstanding civic cleanliness in ${cleanArea}! Ranking in the top 3% compared to the rest of Tamil Nadu's municipal zones, with excellent community engagement and lightning-fast partner dispatches.`;
    }
    if (score >= 75) {
      return `Healthy civic environment in ${cleanArea}. Ranking in the top 15% compared to the rest of Tamil Nadu's municipal districts, showing active citizen reporting and reliable resolution times.`;
    }
    if (score >= 60) {
      return `Moderate civic health in ${cleanArea}. Performing better than 65% of other municipalities in Tamil Nadu, though several unresolved garbage or water logs require tracking.`;
    }
    return `Critical attention needed in ${cleanArea}. Ranking in the bottom 30% of Tamil Nadu's civic zones due to a high density of unresolved reports. Local partner alerts have been prioritized.`;
  };

  // Civic Media State Variables

  const saveLocationToDb = async (lat, lng) => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/update-location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (response.ok) {
        if (user) {
          user.latitude = lat;
          user.longitude = lng;
        }
        triggerToast("Location saved successfully!");
      }
    } catch (err) {
      console.warn("Could not save location to DB:", err);
    }
  };

  const fetchMediaPosts = async () => {
    setMediaLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/media/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMediaPosts(data);
      }
    } catch (e) {
      console.error("Error loading Civic Media posts:", e);
    } finally {
      setMediaLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === "media") {
      fetchMediaPosts();
    }
  }, [currentView]);

  const handleLikePost = async (postId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/media/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMediaPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, likes: data.likes } : p)),
        );
        triggerToast("Post updated! ❤️");
      }
    } catch (err) {
      console.warn("Could not like post:", err);
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const response = await fetch(
        `${apiBaseUrl}/media/posts/${postId}/comment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: text.trim() }),
        },
      );
      if (response.ok) {
        const comments = await response.json();
        setMediaPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, comments } : p)),
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        triggerToast("Comment posted!");
      }
    } catch (err) {
      console.warn("Could not post comment:", err);
    }
  };

  const handleReportPost = async (postId) => {
    const executeReport = async (reason) => {
      try {
        const response = await fetch(`${apiBaseUrl}/media/posts/${postId}/report`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        });
        if (response.ok) {
          triggerToast("Report recorded successfully! 🛡️");
        } else {
          const errData = await response.json();
          Alert.alert("Notice", errData.error || "You have already reported this post.");
        }
      } catch (e) {
        console.error("Error reporting post:", e);
      }
    };

    if (Platform.OS === 'web') {
      const reason = window.prompt("Report this post? Please enter reason:", "Inappropriate content");
      if (reason !== null) {
        await executeReport(reason.trim() || "Inappropriate content");
      }
    } else {
      Alert.alert(
        "Report Post",
        "Are you sure you want to report this post for guidelines violation?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Spam / False Info", onPress: () => executeReport("Spam / False Info") },
          { text: "Abusive Content", onPress: () => executeReport("Abusive Content") },
          { text: "Other Reason", onPress: () => executeReport("Inappropriate Content") },
        ]
      );
    }
  };


  const pickImageFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Media library access is needed to upload images.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const photoData = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setMediaImage(photoData);
        setMediaVideo(null);
        triggerToast("Attached photo from gallery!");
      }
    } catch (err) {
      console.warn("Error picking image:", err);
    }
  };

  const captureImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera access is needed to capture photos.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const photoData = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setMediaImage(photoData);
        setMediaVideo(null);
        triggerToast("Captured and attached photo!");
      }
    } catch (err) {
      console.warn("Error capturing photo:", err);
    }
  };

  const pickTicketImageFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Media library access is needed to upload images.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const photoData = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setTicketImage(photoData);
        triggerToast("Attached photo to ticket!");
      }
    } catch (err) {
      console.warn("Error picking ticket image:", err);
    }
  };

  const captureTicketImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera access is needed to capture photos.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const photoData = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setTicketImage(photoData);
        triggerToast("Captured and attached photo to ticket!");
      }
    } catch (err) {
      console.warn("Error capturing ticket photo:", err);
    }
  };

  const pickVideoFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Media library access is needed to upload videos.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setMediaVideo(asset.uri);
        // Thumbnail placeholder for video preview
        setMediaImage(
          "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=400",
        );
        triggerToast("Attached video from gallery!");
      }
    } catch (err) {
      console.warn("Error picking video:", err);
    }
  };

  const captureVideoFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera access is needed to record videos.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setMediaVideo(asset.uri);
        setMediaImage(
          "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=400",
        );
        triggerToast("Recorded and attached video!");
      }
    } catch (err) {
      console.warn("Error recording video:", err);
    }
  };

  const handleImageSelect = () => {
    if (Platform.OS === "web") {
      const choice = window.confirm(
        "Click OK to select from your Gallery, or Cancel to capture with Camera.",
      );
      if (choice) {
        pickImageFromGallery();
      } else {
        captureImageFromCamera();
      }
    } else {
      Alert.alert(
        "Select Photo Source",
        "Choose how you want to select the photo:",
        [
          { text: "Take Photo (Camera)", onPress: captureImageFromCamera },
          { text: "Choose from Gallery", onPress: pickImageFromGallery },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  };

  const handleVideoSelect = () => {
    if (Platform.OS === "web") {
      const choice = window.confirm(
        "Click OK to select a video from your Gallery, or Cancel to record with Camera.",
      );
      if (choice) {
        pickVideoFromGallery();
      } else {
        captureVideoFromCamera();
      }
    } else {
      Alert.alert(
        "Select Video Source",
        "Choose how you want to select the video:",
        [
          { text: "Record Video (Camera)", onPress: captureVideoFromCamera },
          { text: "Choose from Gallery", onPress: pickVideoFromGallery },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  };

  const handleCreatePost = async () => {
    if (!mediaText.trim()) {
      Alert.alert("Input Needed", "Please write a brief description first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/media/posts/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: mediaText.trim(),
          image: mediaImage,
          video: mediaVideo,
          location: `${userZone}, Chennai`,
        }),
      });
      if (response.ok) {
        setMediaText("");
        setMediaImage(null);
        setMediaVideo(null);
        triggerToast("Civic Media update shared!");
        fetchMediaPosts();
      }
    } catch (err) {
      console.warn("Could not create post:", err);
    } finally {
      setLoading(false);
    }
  };

  const captionScrollRef = useRef();

  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const triggerToast = (message) => {
    setFeedbackText(message);
    feedbackOpacity.setValue(1); // Reset opacity to 1 immediately

    setTimeout(() => {
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setFeedbackText("");
      });
    }, 1000);
  };

  const handleToggleSpeech = async (text, index) => {
    try {
      const isCurrentlySpeaking = speakingIndex === index;
      await Speech.stop();

      if (isCurrentlySpeaking) {
        setSpeakingIndex(null);
      } else {
        setSpeakingIndex(index);
        const cleanText = text.replace(/[*#_`~]/g, "");
        Speech.speak(cleanText, {
          onDone: () => setSpeakingIndex(null),
          onError: () => setSpeakingIndex(null),
          onStopped: () => setSpeakingIndex(null),
        });
      }
    } catch (err) {
      console.warn("Speech error:", err);
      setSpeakingIndex(null);
    }
  };

  const isVapiActiveRef = useRef(false);
  const recordingRef = useRef(null);

  // Safely stop speech recognition & playback if user leaves voice view
  useEffect(() => {
    if (currentView !== "voice") {
      if (isVapiActiveRef.current) {
        console.log("Stopping voice agent as user exited voice view");
        isVapiActiveRef.current = false;
        Speech.stop().catch(() => {});
        setRealtimeSessionState("idle");
        setUserCaption("");
        setAiCaption("");
        setActivePopupCard(null);
      }
    }
  }, [currentView]);

  const startSpeechRecognitionLoop = async () => {
    console.log("Mock start speech recognition (Expo Go compatible)");
    setRealtimeSessionState("listening");
    setUserCaption("I need to report a pothole on Main Street...");
    setTimeout(() => {
      handleProcessedSpeech("I need to report a pothole on Main Street");
    }, 2000);
  };

  const handleProcessedSpeech = async (transcribedText) => {
    if (!transcribedText || !transcribedText.trim()) return;
    setRealtimeSessionState("processing");

    try {
      // Add user message to UI immediately
      setMessages((prev) => [
        ...prev,
        {
          sender: "user",
          text: transcribedText.trim(),
          botType: "smartfix",
        },
      ]);

      // Query the AI Agent chatbot
      console.log("Querying AI Agent with real-time transcription...");
      const chatResponse = await fetch(`${apiBaseUrl}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: transcribedText.trim(),
          conversationId,
          botType: "smartfix",
        }),
      });

      const chatData = await chatResponse.json();
      if (!chatResponse.ok)
        throw new Error(chatData.error || "Failed to query chatbot");

      setConversationId(chatData.conversationId);

      // Handle interactive card popups
      if (chatData.action) {
        console.log("AI Agent triggered action:", chatData.action);
        if (chatData.action.action === "REQUEST_LOCATION") {
          setActivePopupCard("map");
          setActiveReqCategory(chatData.action.category || "other" || "other");
          setActiveReqSummary(
            chatData.action.summary || chatData.action.description || "",
          );
          setActiveReqTitle(
            chatData.action.title || chatData.action.title_issue || "",
          );
        } else if (chatData.action.action === "ESCALATE_TO_HUMAN") {
          setActivePopupCard("dispatch");
          handleEscalate(
            chatData.action.summary || chatData.action.description,
            chatData.action.emailDraft,
          );
        }
      }

      // Add AI reply to messages thread
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: chatData.reply,
          actionMetadata: chatData.action || null,
          botType: "smartfix",
        },
      ]);

      // Speak response out loud using Expo-Speech
      const cleanReply = chatData.reply.replace(/[*#_`~]/g, "");
      setRealtimeSessionState("speaking");
      setAiCaption("");

      // Type out response caption dynamically (visual wow factor)
      const aiWords = cleanReply.split(" ");
      let currentAiText = "";

      await Speech.stop();
      Speech.speak(cleanReply, {
        language: "en-US",
        onDone: () => {
          console.log(
            "AI Agent speaking completed. Resuming hands-free listening...",
          );
          if (isVapiActiveRef.current) {
            startSpeechRecognitionLoop();
          } else {
            setRealtimeSessionState("idle");
          }
        },
        onError: (err) => {
          console.warn("Speech playback error:", err);
          if (isVapiActiveRef.current) {
            startSpeechRecognitionLoop();
          } else {
            setRealtimeSessionState("idle");
          }
        },
      });

      for (let i = 0; i < aiWords.length; i++) {
        if (!isVapiActiveRef.current) break;
        await new Promise((resolve) => setTimeout(resolve, 60));
        currentAiText += (i === 0 ? "" : " ") + aiWords[i];
        setAiCaption(currentAiText);
      }
    } catch (err) {
      console.error("Error processing voice turn:", err);
      triggerToast("Voice processing error.");
      setRealtimeSessionState("idle");
      isVapiActiveRef.current = false;
    }
  };

  const handleMicPress = async () => {
    if (isVapiActiveRef.current) {
      // Toggle off session
      console.log("Disconnecting voice agent session...");
      isVapiActiveRef.current = false;
      await Speech.stop().catch(() => {});
      await setRealtimeSessionState("idle");
      setUserCaption("");
      setAiCaption("");
      setActivePopupCard(null);
    } else {
      // Toggle on session
      console.log("Initializing continuous voice agent session...");
      isVapiActiveRef.current = true;
      setUserCaption("");
      setAiCaption("");
      setActivePopupCard(null);
      setRealtimeSessionState("speaking");

      const greeting =
        "Hello! I am your SmartFix AI helper. What public utility issue can I help you resolve in your neighborhood today?";
      setAiCaption(greeting);
      await Speech.stop();
      Speech.speak(greeting, {
        language: "en-US",
        onDone: () => {
          if (isVapiActiveRef.current) {
            startSpeechRecognitionLoop();
          }
        },
        onError: (err) => {
          console.warn("Initial speech error:", err);
          if (isVapiActiveRef.current) {
            startSpeechRecognitionLoop();
          }
        },
      });
    }
  };

  // Stop speech & recognition when component unmounts
  useEffect(() => {
    return () => {
      isVapiActiveRef.current = false;
      Speech.stop().catch(() => {});
    };
  }, []);

  const scrollViewRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        let location = await Location.getCurrentPositionAsync({});
        const currentLat = location.coords.latitude;
        const currentLng = location.coords.longitude;

        let geocode = await Location.reverseGeocodeAsync({
          latitude: currentLat,
          longitude: currentLng,
        });

        let area = "Chennai South";
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          // Narrow down the jurisdiction to their specific neighborhood/local area/district
          area = g.district || g.subregion || g.name || g.city;
          setUserZone(area);
        }

        // GPS Location Synchronization
        if (user) {
          const savedLat = user.latitude;
          const savedLng = user.longitude;

          if (!savedLat || !savedLng) {
            // No saved location yet: save silently
            setUserLat(currentLat);
            setUserLng(currentLng);
            saveLocationToDb(currentLat, currentLng);
          } else {
            // Compare current GPS with saved coordinates
            const diffLat = Math.abs(currentLat - savedLat);
            const diffLng = Math.abs(currentLng - savedLng);

            if (diffLat > 0.001 || diffLng > 0.001) {
              // Location changed! Update silently
              setUserLat(currentLat);
              setUserLng(currentLng);
              saveLocationToDb(currentLat, currentLng);
            } else {
              // Location matches saved coordinates
              setUserLat(savedLat);
              setUserLng(savedLng);
            }
          }
        } else {
          // Offline / guest mode: just set coords
          setUserLat(currentLat);
          setUserLng(currentLng);
        }
      } catch (err) {
        console.log(err);
      }
    })();
  }, [user]);

  // Dynamic greeting based on current local hour
  const getGreetingTime = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Seeding initial welcome message when entering chat
  useEffect(() => {
    handleResetChat("smartfix");
    fetchMyRequests();
  }, []);

  useEffect(() => {
    if (token) {
      const interval = setInterval(() => {
        fetchMyRequests();
      }, 60000); // Check every 10 seconds as requested
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (currentView === "chat") {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, currentView]);

  const handleResetChat = (botType) => {
    setActiveBot(botType);
    let greetingText = "";

    if (botType === "smartfix") {
      greetingText = `Hello ${user?.name?.split(" ")[0] || "Citizen"}! I am your SmartFix AI Assistant. \n\nI can help you report and resolve public issues like garbage overflow, water leaks, broken streetlights, or potholes in your area.\n\nWhat issue would you like to report today?`;
    } else if (botType === "analyst") {
      greetingText = `Welcome to the Civic Analysis portal!  I am your Neighborhood Analyst Bot.\n\n* **Your Civic Points:** ${myCivicPoints} PTS (${myBadge} Tier)\n* **Neighborhood Health Score:** 84%\n* **Pending Tasks In Chennai:** 3 open\n\nI can show you neighborhood statistics, resolution progress, and historical safety metrics. What would you like to analyze?`;
    }
    setMessages([
      {
        sender: "ai",
        text: greetingText,
        botType,
      },
    ]);
    setIsChatActive(false);
  };

  const fetchMyRequests = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/requests/user-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();

        // Push notification on ticket status change with persistent storage matching
        try {
          if (data && data.length > 0) {
            let AsyncStorageInstance = null;
            try {
              AsyncStorageInstance = require("@react-native-async-storage/async-storage").default;
            } catch (e) {}

            let storedMap = {};
            if (AsyncStorageInstance) {
              const storedStr = await AsyncStorageInstance.getItem("notified_ticket_statuses");
              if (storedStr) {
                storedMap = JSON.parse(storedStr);
              }
            } else if (typeof window !== "undefined" && window.localStorage) {
              const storedStr = window.localStorage.getItem("notified_ticket_statuses");
              if (storedStr) {
                storedMap = JSON.parse(storedStr);
              }
            }

            let mapChanged = false;

            data.forEach((newItem) => {
              const ticketId = newItem._id;
              const currentStatus = newItem.status;
              const lastNotifiedStatus = storedMap[ticketId];

              if (lastNotifiedStatus === undefined) {
                // First time seeing this ticket, save its current status so we don't alert retroactively
                storedMap[ticketId] = currentStatus;
                mapChanged = true;
              } else if (lastNotifiedStatus !== currentStatus) {
                // Status has officially changed! Send immediate push notification
                const shortId = `#SF-${ticketId.substring(ticketId.length - 6).toUpperCase()}`;
                
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Ticket Update 🔔",
                    body: `Your ticket ${shortId} status has changed to "${currentStatus}"!`,
                    sound: true,
                  },
                  trigger: null,
                }).catch((notifErr) => console.warn(notifErr));

                // Save new status so we only alert exactly one time
                storedMap[ticketId] = currentStatus;
                mapChanged = true;
              }
            });

            if (mapChanged) {
              const mapStr = JSON.stringify(storedMap);
              if (AsyncStorageInstance) {
                await AsyncStorageInstance.setItem("notified_ticket_statuses", mapStr);
              } else if (typeof window !== "undefined" && window.localStorage) {
                window.localStorage.setItem("notified_ticket_statuses", mapStr);
              }
            }
          }
        } catch (compErr) {
          console.warn("Error comparing status for notifications:", compErr);
        }

        setMyRequests(data);

        // Update selectedIssue in real-time if detailed drawer is currently open
        if (selectedIssue) {
          const updatedSelected = data.find((r) => r._id === selectedIssue._id);
          if (updatedSelected) {
            setSelectedIssue(updatedSelected);
          }
        }
      } else {
        throw new Error("Failed to fetch requests");
      }
    } catch (e) {
      console.error("Could not fetch requests:", e);
      setMyRequests([]);
      Alert.alert(
        "Connection Error",
        "Could not load your service requests from the server. Please check your connection and try again.",
      );
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!isChatActive) {
      setIsChatActive(true);
    }

    // Add user message locally
    const newUserMessage = { sender: "user", text };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversationId,
          botType: activeBot,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setConversationId(data.conversationId);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply,
          actionMetadata: data.action,
          botType: activeBot,
        },
      ]);

      if (data.action && data.action.action === "ESCALATE_TO_HUMAN") {
        handleEscalate(data.action.summary, data.action.emailDraft);
      }
    } catch (err) {
      console.error("API error during chat:", err.message);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "⚠️ I am unable to connect to the SmartFix core engine right now. Please make sure the server is online and try sending your message again.",
          botType: activeBot,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  const handleLocationConfirm = async (
    latitude,
    longitude,
    category,
    summary,
    title,
  ) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: category || "garbage",
          description: summary || "",
          title: title || "",
          latitude,
          longitude,
          conversationId,
          citizenImage: ticketImage || null,
        }),
      });

      // Clear ticket image upon successful creation
      setTicketImage(null);

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Trigger local push notification for ticket creation
      try {
        const finalTitle = data.request.title || title || "Civic Issue";
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Ticket Created ✅",
            body: `Your issue "${finalTitle}" has been recorded.`,
          },
          trigger: null,
        });
      } catch (notifErr) {
        console.warn(
          "Could not fire local ticket creation notification:",
          notifErr,
        );
      }

      if (data.assigned) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: ` **COMPLAINT REGISTERED SUCCESSFULLY!**\n\n* **Complaint Ref:** SF-${data.request._id.substring(18)}\n* **Status:** Assigned to Local Partner\n* **Partner Assigned:** **${data.partner.name}** (${data.partner.distance.toFixed(1)} km away)\n\nAn email and in-app notification have been dispatched. They are on their way!`,
          },
        ]);
      } else if (data.fallbackAvailable) {
        setActiveRequest(data.request);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: ` **Location Matched!**\n\nThere are no partners directly inside your 2.5km area. However, I found a service partner **${data.fallbackPartner.name}** active nearby (**${data.fallbackPartner.distance.toFixed(1)} km** away).\n\nWould you like me to assign them to your complaint?`,
            actionMetadata: {
              action: "CONFIRM_FALLBACK",
              partnerId: data.fallbackPartner.id,
              requestId: data.request._id,
            },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: ` **COMPLAINT REGISTERED!**\n\n* **Complaint Ref:** SF-${data.request._id.substring(18)}\n* **Status:** Pending assignment\n\nWe are currently matching you with an available technician. You will receive an alert shortly.`,
          },
        ]);
      }

      fetchMyRequests();
    } catch (e) {
      console.error("Could not raise request on API:", e.message);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **FAILED TO REGISTER COMPLAINT**\n\nI was unable to raise your service request on the server. Please check your connection and try again.\n\n*Error details:* ${e.message}`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  const handleFeedbackSubmit = async (requestId) => {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          rating: ratingVal,
          feedback: feedbackComment,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      Alert.alert(
        "Feedback Submitted",
        "Thank you for rating our municipal service! Your feedback has been recorded.",
      );
      setRatingVal(5);
      setFeedbackComment("");
      setSelectedIssue(data.request);
      fetchMyRequests();
    } catch (e) {
      console.error("Could not submit feedback:", e.message);
      Alert.alert(
        "Submission Error",
        `Failed to record feedback: ${e.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmFallback = async (requestId, partnerId) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/assign-partner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, partnerId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: ` **Nearby Partner Assigned!**\n\nI have successfully assigned the nearby partner to your complaint. They have been alerted and will arrive shortly.`,
        },
      ]);
      fetchMyRequests();
    } catch (e) {
      console.error("Could not assign partner:", e.message);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **PARTNER ASSIGNMENT FAILED**\n\nI was unable to assign the partner. Please check your network and try again.`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  };

  const handleEscalate = async (summary, emailDraft) => {
    try {
      await fetch(`${apiBaseUrl}/requests/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          escalationNotes: summary,
          emailDraft,
        }),
      });
    } catch (e) {
      console.error("Failed to escalate grievance:", e.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. LIQUID DUSTY PINK GRADIENT BACKGROUND */}
      <LinearGradient
        colors={["#fef4f8", "#f0f2fd", "#ffffff"]}
        style={styles.absoluteBackground}
      />

      {/* 2. HEADER: Dynamic top-left greeting next to Hamburger icon, Profile avatar and Bell side-by-side in Top Right */}
      <View style={styles.navBar}>
        <View style={styles.navLeftWrapper}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setIsDrawerOpen(true)}
          >
            <Menu stroke={COLORS.text} size={22} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.greetingHeaderBox}>
            <Text style={styles.greetingTimeText}>{getGreetingTime()}</Text>
            <Text style={styles.greetingNameText}>
              {user?.name?.split(" ")[0] || "Citizen"}
            </Text>
          </View>
        </View>

        <View style={styles.navRightGroup}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setCurrentView("notifications")}
          >
            <Bell stroke={COLORS.text} size={18} />
            <View style={styles.bellRedDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setIsProfileOpen(true)}
          >
            <View
              style={[
                styles.profileAvatar,
                {
                  backgroundColor: COLORS.primary,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Text
                style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}
              >
                {(user?.name || "C")[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. CONDITIONAL RENDER VIEWS */}

      {/* CHAT SESSION (AI CHAT - DEFAULT VIEW) */}
      {currentView === "chat" && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.chatScroll,
              !isChatActive && { justifyContent: "center" },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* RENDER HELLO ASK ME ANYTHING THEME DIRECTLY IN CHAT BEFORE CHAT IS ACTIVE */}
            {!isChatActive && (
              <View style={styles.askMeThemeContainer}>
                {/* Greeting Header */}
                <View style={styles.askMeHeader}>
                  <Text style={styles.askMeMainText}>
                    Hello, <Text style={styles.askMeHighlightText}>Ask Me</Text>
                    {"\n"}Anything You Need
                  </Text>
                </View>
              </View>
            )}

            {/* RENDER THE ACTUAL SMART CHART MESSAGES */}
            {messages.length > 0 &&
              messages.map((msg, index) => (
                <View key={index} style={styles.messageRow}>
                  {msg.sender === "ai" ? (
                    <View style={styles.aiMsgWrapper}>
                      <Image
                        source={require("../../assets/icon.png")}
                        style={styles.aiBotAvatarImage}
                      />
                      <View style={styles.aiBubble}>
                        <FormattedText style={styles.aiText} text={msg.text} />

                        {/* RENDER INLINE LEAFLET MAP ON LOCATION REQUEST */}
                        {msg.actionMetadata &&
                          msg.actionMetadata.action === "REQUEST_LOCATION" && (
                            <View style={styles.inlineMapCard}>
                              <View style={styles.mapCardHeader}>
                                <MapPin stroke={COLORS.primary} size={14} />
                                <Text style={styles.mapCardTitle}>
                                  Confirm Coordinates
                                </Text>
                              </View>

                              <TouchableOpacity
                                style={{
                                  backgroundColor: COLORS.primary,
                                  padding: 12,
                                  borderRadius: 10,
                                  alignItems: "center",
                                  marginTop: 10,
                                }}
                                onPress={() => setActivePopupCard("map")}
                              >
                                <Text
                                  style={{ color: "#fff", fontWeight: "800" }}
                                >
                                  Open Fullscreen Map
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                        {/* RENDER FALLBACK CONFIRMATION OPTIONS */}
                        {msg.actionMetadata &&
                          msg.actionMetadata.action === "CONFIRM_FALLBACK" && (
                            <View style={styles.fallbackOptionBox}>
                              <TouchableOpacity
                                style={styles.fallbackBtnYes}
                                onPress={() =>
                                  handleConfirmFallback(
                                    msg.actionMetadata.requestId,
                                    msg.actionMetadata.partnerId,
                                  )
                                }
                              >
                                <Text style={styles.fallbackBtnText}>
                                  Assign Nearby Partner
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.fallbackBtnNo}
                                onPress={() =>
                                  handleSendMessage(
                                    "No, escalate to support executive",
                                  )
                                }
                              >
                                <Text style={styles.fallbackBtnTextNo}>
                                  Escalate
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                        {/* Thumbs-up action icons under AI message */}
                        <View style={styles.bubbleActionRow}>
                          <AnimatedLikeButton
                            isLiked={likedMessages[index]}
                            onPress={() => {
                              const newLikedState = !likedMessages[index];
                              setLikedMessages((prev) => ({
                                ...prev,
                                [index]: newLikedState,
                              }));
                              if (newLikedState) {
                                triggerToast("Thanks for your feedback! ");
                              }
                            }}
                          />

                          <AnimatedSpeechButton
                            isSpeaking={speakingIndex === index}
                            onPress={() => handleToggleSpeech(msg.text, index)}
                          />

                          <TouchableOpacity
                            style={styles.bubbleActionBtn}
                            onPress={() =>
                              handleSendMessage(
                                "Explain that again in more detail",
                              )
                            }
                          >
                            <RefreshCw stroke={COLORS.textMuted} size={11} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.userMsgWrapper}>
                      <LinearGradient
                        colors={COLORS.userBubble}
                        style={styles.userBubble}
                      >
                        <FormattedText
                          style={styles.userText}
                          text={msg.text}
                        />
                      </LinearGradient>
                      <View
                        style={[
                          styles.userAvatarRight,
                          {
                            backgroundColor: COLORS.primary,
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 14,
                            fontWeight: "900",
                          }}
                        >
                          {(user?.name || "C")[0].toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  SmartFix Bot is processing...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Translucent Chat Input Capsule Bar */}
          <View style={styles.chatInputCapsuleContainer}>
            <View style={styles.chatInputCapsule}>
              <TextInput
                style={styles.textInputStyle}
                placeholder="Ask me something..."
                placeholderTextColor={COLORS.textMuted}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
                onSubmitEditing={() => handleSendMessage()}
              />

              <TouchableOpacity
                style={styles.sendCapsuleBtn}
                onPress={() => handleSendMessage()}
              >
                <Send stroke="#ffffff" size={14} style={{ marginLeft: 2 }} />
              </TouchableOpacity>

              {/* Absolute Overlay for Like Feedback Toast inside the Textbox */}
              {feedbackText !== "" && (
                <Animated.View
                  style={[styles.feedbackOverlay, { opacity: feedbackOpacity }]}
                >
                  <Text style={styles.feedbackInputText}>{feedbackText}</Text>
                </Animated.View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* DASHBOARD STATS VIEW (CIVIC POINT HOME) */}
      {currentView === "home" && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={userRefreshing}
              onRefresh={handleRefresh}
              colors={["#db2777"]}
              tintColor={"#db2777"}
            />
          }
        >
          {/* Header Banner */}
          <View style={styles.dashboardSectionHeader}>
            <Text style={styles.dashboardHeaderTitle}>
              {t("Civic Dashboard")}
            </Text>
            <Text style={styles.dashboardHeaderSub}>
              Live City Operations & Contribution Scorecard
            </Text>
          </View>

          {/* 1. Core Profile Scorecard Card */}
          <View style={styles.civicScorecardContainer}>
            <LinearGradient
              colors={["#db2777", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.civicPointsStatsCard}
            >
              <View style={styles.civicCardHeaderRow}>
                <View>
                  <Text style={styles.civicPointsTitle}>
                    CIVIC LOYALTY POINTS
                  </Text>
                  <Text style={styles.civicPointsValueText}>
                    {myCivicPoints} PTS
                  </Text>
                </View>
                <View style={styles.civicBadgePillContainer}>
                  <Text style={styles.civicBadgePillText}>
                    {myBadge.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.civicCardSubtext}>
                {ptsToNext > 0
                  ? `Earn ${ptsToNext} PTS to reach the next tier!`
                  : "Maximum tier level reached!"}
              </Text>
            </LinearGradient>
          </View>

          {/* 2. Organized Operational Stats Grid */}
          <View style={styles.organizedStatsGrid}>
            <View style={styles.statsGridCard}>
              <Text style={styles.statsCardVal}>
                {String(activeTicketsCount).padStart(2, "0")}
              </Text>
              <Text style={styles.statsCardLbl}>Active Reports</Text>
            </View>
            <View style={styles.statsGridCard}>
              <Text style={styles.statsCardVal}>
                {String(resolvedTicketsCount).padStart(2, "0")}
              </Text>
              <Text style={styles.statsCardLbl}>Resolved SLA</Text>
            </View>
            <View style={styles.statsGridCard}>
              <Text style={styles.statsCardVal}>
                {userZone.length > 8
                  ? userZone.substring(0, 8) + ".."
                  : userZone}
              </Text>
              <Text style={styles.statsCardLbl}>Jurisdiction</Text>
            </View>
          </View>

          {/* 3. Dynamic Neighborhood Civic Health Card */}
          <View style={styles.healthMetricCard}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={styles.healthMetricTitle}>Civic Health Index</Text>
              <View
                style={[
                  styles.healthScoreBadge,
                  {
                    backgroundColor:
                      civicHealthScore >= 75 ? "#d1fae5" : "#fee2e2",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.healthScoreBadgeText,
                    { color: civicHealthScore >= 75 ? "#065f46" : "#991b1b" },
                  ]}
                >
                  {civicHealthScore >= 90
                    ? "Excellent"
                    : civicHealthScore >= 75
                      ? "Healthy"
                      : "Attention"}
                </Text>
              </View>
            </View>
            <View style={styles.healthRowContainer}>
              <Text style={styles.healthScoreTextValue}>
                {civicHealthScore}%
              </Text>
              <Text style={styles.healthScoreDescText}>
                {getHealthLabelText(civicHealthScore, userZone)}
              </Text>
            </View>
          </View>

          {/* 4. Advanced Neighborhood Performance Indicators */}
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>
              Zone Performance Indicators
            </Text>

            {/* Garbage clearance */}
            <View style={styles.indicatorRow}>
              <View style={styles.indicatorMeta}>
                <Text style={styles.indicatorName}>Garbage Disposal SLA</Text>
                <Text style={styles.indicatorPct}>{garbageSLA}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${garbageSLA}%`,
                      backgroundColor: COLORS.primary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Street health */}
            <View style={styles.indicatorRow}>
              <View style={styles.indicatorMeta}>
                <Text style={styles.indicatorName}>
                  Pothole & Road Repair Rate
                </Text>
                <Text style={styles.indicatorPct}>{roadSLA}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${roadSLA}%`, backgroundColor: COLORS.secondary },
                  ]}
                />
              </View>
            </View>

            {/* Water safety */}
            <View style={styles.indicatorRow}>
              <View style={styles.indicatorMeta}>
                <Text style={styles.indicatorName}>Water Log Resolution</Text>
                <Text style={styles.indicatorPct}>{waterSLA}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${waterSLA}%`, backgroundColor: "#06b6d4" },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* 5. Civic Leaderboard Mini Widget */}
          <View style={styles.leaderboardWidgetCard}>
            <Text style={styles.leaderboardWidgetTitle}>
              Top Contributors in {userZone}
            </Text>
            {(leaderboardData || []).slice(0, 3).map((item, idx) => {
              const currentName = user?.name?.split(" ")[0] || "You";
              const isMe =
                item.name.includes(currentName) || item.name === user?.name;
              return (
                <View
                  key={idx}
                  style={[
                    styles.leaderboardWidgetRow,
                    isMe && styles.leaderboardWidgetRowMe,
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Text style={styles.leaderboardWidgetRank}>#{idx + 1}</Text>
                    <View
                      style={[
                        styles.profileAvatar,
                        {
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isMe
                            ? COLORS.primary
                            : COLORS.secondary,
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: 12,
                          fontWeight: "900",
                        }}
                      >
                        {(item.name || "C")[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.leaderboardWidgetName,
                        isMe && { fontWeight: "900", color: COLORS.primary },
                      ]}
                    >
                      {item.name.split(" ")[0]} {isMe ? "(You)" : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.leaderboardWidgetPts}>
                      {item.pts} PTS
                    </Text>
                    <Text style={styles.leaderboardWidgetBadge}>
                      {item.badge}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Recent Reports Section */}
          <View style={styles.recentReportsHeaderRow}>
            <Text style={styles.recentReportsTitle}>Recent Reports</Text>
            <TouchableOpacity onPress={() => setCurrentView("complaints")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Render real-time requests inside list */}
          <View style={styles.historyList}>
            {myRequests.length === 0 ? (
              <View style={styles.emptyReportsBox}>
                <Clock
                  stroke={COLORS.textMuted}
                  size={24}
                  style={{ marginBottom: 8 }}
                />
                <Text style={styles.emptyReportsText}>
                  No recent utility reports logged.
                </Text>
              </View>
            ) : (
              myRequests.slice(0, 3).map((req, i) => (
                <TouchableOpacity
                  key={req._id || i}
                  style={styles.historyItem}
                  onPress={() => {
                    setSelectedIssue(req);
                    setActivePopupCard("issueDetails");
                  }}
                >
                  <View
                    style={[
                      styles.historyIconWrapper,
                      {
                        backgroundColor:
                          req.category === "garbage"
                            ? "rgba(219, 39, 119, 0.08)"
                            : req.category === "water"
                              ? "rgba(168, 85, 247, 0.08)"
                              : "rgba(0, 180, 216, 0.08)",
                      },
                    ]}
                  >
                    <MapPin
                      stroke={
                        req.category === "garbage"
                          ? COLORS.primary
                          : req.category === "water"
                            ? COLORS.secondary
                            : "#00b4d8"
                      }
                      size={14}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyText} numberOfLines={1}>
                      {req.description}
                    </Text>
                    <Text style={styles.historySubtext}>
                      {req.status} -{" "}
                      {new Date(req.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <ArrowRight stroke={COLORS.textMuted} size={14} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* AI REALTIME HELP VIEW (VOICE PULSE VIEW) */}
      {currentView === "voice" && (
        <View style={styles.voicePulseContainer}>
          {/* Header Row */}
          <View style={styles.voicePulseHeader}>
            <TouchableOpacity
              style={styles.trackBackButton}
              onPress={() => setCurrentView("chat")}
            >
              <ChevronLeft stroke={COLORS.text} size={18} />
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}
              >
                Chat
              </Text>
            </TouchableOpacity>
            <Text style={styles.voiceModeTitle}>AI Realtime Help</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* 1. DYNAMIC TRANSLATION TRANSCRIBING CAPTIONS AREA */}
          <View style={styles.captionsContainer}>
            <ScrollView
              ref={captionScrollRef}
              onContentSizeChange={() =>
                captionScrollRef.current?.scrollToEnd({ animated: true })
              }
              style={styles.captionsScroll}
              contentContainerStyle={{ gap: 14 }}
            >
              {userCaption === "" &&
                aiCaption === "" &&
                realtimeSessionState === "idle" && (
                  <View style={styles.captionsPlaceholder}>
                    <Text style={styles.placeholderCaptionText}>
                      Tap the microphone below to connect to the live SmartFix
                      Vapi Voice Agent. Once connected, the agent will guide you
                      through resolving your municipal issue in real-time.
                    </Text>
                  </View>
                )}

              {userCaption !== "" && (
                <View style={styles.speechUserRow}>
                  <View style={styles.speechUserBubble}>
                    <Text style={styles.speechUserText}>{userCaption}</Text>
                  </View>
                  <View style={styles.speechUserAvatar}>
                    <Text style={{ fontSize: 12 }}></Text>
                  </View>
                </View>
              )}

              {realtimeSessionState === "processing" && (
                <View style={styles.speechAiRow}>
                  <View style={styles.speechAiAvatar}>
                    <Text style={{ fontSize: 12 }}></Text>
                  </View>
                  <View style={styles.speechAiBubbleProcessing}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.processingText}>
                      {selectedLanguage === "ta"
                        ? "Processing response (TA)...."
                        : selectedLanguage === "hi"
                          ? "Processing response (HI)..."
                          : selectedLanguage === "te"
                            ? "Processing response (TE)..."
                            : "AI is processing response..."}
                    </Text>
                  </View>
                </View>
              )}

              {aiCaption !== "" && (
                <View style={styles.speechAiRow}>
                  <View style={styles.speechAiAvatar}>
                    <Text style={{ fontSize: 12 }}></Text>
                  </View>
                  <View style={styles.speechAiBubble}>
                    <FormattedText
                      style={styles.speechAiText}
                      text={aiCaption}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          {/* 2. REALTIME HOLOGRAPHIC SOUNDBAR WAVE */}
          <SoundBarWave
            isPlaying={
              realtimeSessionState === "listening" ||
              realtimeSessionState === "speaking" ||
              realtimeSessionState === "processing"
            }
            volume={volume}
            realtimeSessionState={realtimeSessionState}
          />

          {/* 3. MAIN CENTRAL WAVE/PULSE HEART BUTTON */}
          <View style={styles.voiceHelpButtonSection}>
            <Text style={styles.sessionStateText}>
              {realtimeSessionState === "idle"
                ? "VAPI DISCONNECTED - TAP MIC TO START"
                : realtimeSessionState === "listening"
                  ? "VAPI LISTENING..."
                  : realtimeSessionState === "processing"
                    ? "VAPI THINKING..."
                    : "VAPI AGENT SPEAKING..."}
            </Text>

            <TouchableOpacity
              style={styles.voiceRecordBtn}
              onPress={handleMicPress}
            >
              <LinearGradient
                colors={
                  realtimeSessionState === "listening"
                    ? ["#db2777", "#f43f5e"]
                    : realtimeSessionState === "speaking"
                      ? ["#a855f7", "#db2777"]
                      : ["#db2777", "#a855f7"]
                }
                style={styles.centerSphereGrad}
              >
                {realtimeSessionState === "processing" ? (
                  <ActivityIndicator size="large" color="#ffffff" />
                ) : (
                  <Mic stroke="#ffffff" size={26} strokeWidth={2.5} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* LEADERBOARD VIEW */}
      {currentView === "leaderboard" && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={userRefreshing}
              onRefresh={handleRefresh}
              colors={["#db2777"]}
              tintColor={"#db2777"}
            />
          }
        >
          <View style={styles.dashboardSectionHeader}>
            <Text style={styles.dashboardHeaderTitle}>
              {t("Civic Leaderboard")}
            </Text>
            <Text style={styles.dashboardHeaderSub}>
              {t("Top contributors in")} {userZone.substring(0, 20)}.
            </Text>
          </View>

          {/* Detailed Rank Scorecard */}
          <View
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 20,
              marginTop: 10,
              elevation: 4,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.15,
              shadowRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(219, 39, 119, 0.08)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomWidth: 1,
                borderColor: "rgba(30, 27, 75, 0.05)",
                paddingBottom: 12,
                marginBottom: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Award
                  stroke={COLORS.primary}
                  size={20}
                  fill="rgba(219, 39, 119, 0.1)"
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                  }}
                >
                  YOUR RANK & IMPACT
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "900",
                    color: COLORS.success,
                    textTransform: "uppercase",
                  }}
                >
                  {myBadge} tier
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: COLORS.primary,
                textAlign: "center",
              }}
            >
              {leaderboardData.length > 0
                ? `#${leaderboardData.findIndex((u) => u.name.includes(user?.name?.split(" ")[0] || "You") || u.name === user?.name) + 1} GLOBAL RANK`
                : "CALCULATING RANK..."}
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginTop: 15,
                paddingTop: 12,
                borderTopWidth: 0.5,
                borderColor: "rgba(30, 27, 75, 0.03)",
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: COLORS.text,
                  }}
                >
                  {myCivicPoints}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: COLORS.textMuted,
                    marginTop: 2,
                  }}
                >
                  Loyalty Pts
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: COLORS.text,
                  }}
                >
                  {myRequests.length}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: COLORS.textMuted,
                    marginTop: 2,
                  }}
                >
                  Reports Logged
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: COLORS.text,
                  }}
                >
                  {civicHealthScore}%
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: COLORS.textMuted,
                    marginTop: 2,
                  }}
                >
                  Civic Health
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 12.5,
                color: COLORS.textMuted,
                textAlign: "center",
                marginTop: 15,
                fontWeight: "600",
                backgroundColor: "rgba(30, 27, 75, 0.02)",
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              {ptsToNext > 0
                ? `Only ${ptsToNext} PTS away from next Badge level!`
                : "Maximum badge rank unlocked!"}
            </Text>
          </View>

          {/* Top 3 Podium */}
          {leaderboardData.length >= 3 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: 35,
                marginBottom: 25,
                paddingHorizontal: 4,
              }}
            >
              {/* Rank 2 (Left) */}
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.75)",
                  padding: 12,
                  borderRadius: 16,
                  marginRight: 8,
                  height: 140,
                  justifyContent: "flex-end",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#e2e8f0",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "absolute",
                    top: -16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "900",
                      color: "#64748b",
                    }}
                  >
                    2
                  </Text>
                </View>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: COLORS.secondary,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 16,
                      fontWeight: "900",
                    }}
                  >
                    {(leaderboardData[1].name || "C")[0].toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: COLORS.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {leaderboardData[1].name.split(" ")[0]}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "900",
                    color: COLORS.secondary,
                    marginTop: 2,
                  }}
                >
                  {leaderboardData[1].pts} PTS
                </Text>
                <Text
                  style={{
                    fontSize: 8.5,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                    marginTop: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {leaderboardData[1].badge}
                </Text>
              </View>

              {/* Rank 1 (Middle - Taller) */}
              <View
                style={{
                  flex: 1.2,
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  padding: 14,
                  borderRadius: 20,
                  height: 165,
                  justifyContent: "flex-end",
                  shadowColor: "#db2777",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  zIndex: 10,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "#fef3c7",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "absolute",
                    top: -19,
                    borderWidth: 1,
                    borderColor: "#fbbf24",
                  }}
                >
                  <Trophy stroke="#d97706" size={18} fill="#fbbf24" />
                </View>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: COLORS.primary,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 8,
                    borderWidth: 2,
                    borderColor: "#fbbf24",
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 18,
                      fontWeight: "900",
                    }}
                  >
                    {(leaderboardData[0].name || "C")[0].toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "900",
                    color: COLORS.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {leaderboardData[0].name.split(" ")[0]}
                </Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: "900",
                    color: COLORS.primary,
                    marginTop: 2,
                  }}
                >
                  {leaderboardData[0].pts} PTS
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "900",
                    color: "#d97706",
                    marginTop: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {leaderboardData[0].badge}
                </Text>
              </View>

              {/* Rank 3 (Right) */}
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.75)",
                  padding: 12,
                  borderRadius: 16,
                  marginLeft: 8,
                  height: 130,
                  justifyContent: "flex-end",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: "#ffedd5",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "absolute",
                    top: -15,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "900",
                      color: "#b45309",
                    }}
                  >
                    3
                  </Text>
                </View>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#06b6d4",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    {(leaderboardData[2].name || "C")[0].toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "800",
                    color: COLORS.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {leaderboardData[2].name.split(" ")[0]}
                </Text>
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: "900",
                    color: "#06b6d4",
                    marginTop: 2,
                  }}
                >
                  {leaderboardData[2].pts} PTS
                </Text>
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                    marginTop: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {leaderboardData[2].badge}
                </Text>
              </View>
            </View>
          )}

          {/* Ranks 4+ List */}
          <View style={{ marginTop: 10, gap: 12 }}>
            {(leaderboardData.length >= 3
              ? leaderboardData.slice(3)
              : leaderboardData
            ).map((u, i) => {
              const rankIdx = leaderboardData.length >= 3 ? i + 3 : i;
              const currentName = user?.name?.split(" ")[0] || "You";
              const isMe =
                u.name.includes(currentName) || u.name === user?.name;

              return (
                <View
                  key={rankIdx}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isMe
                      ? "rgba(219, 39, 119, 0.04)"
                      : "rgba(255, 255, 255, 0.65)",
                    padding: 15,
                    borderRadius: 16,
                    borderWidth: isMe ? 1 : 0.5,
                    borderColor: isMe
                      ? COLORS.primary
                      : "rgba(30, 27, 75, 0.05)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      width: 35,
                      color: COLORS.textMuted,
                    }}
                  >
                    #{rankIdx + 1}
                  </Text>

                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: isMe ? COLORS.primary : COLORS.secondary,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      {(u.name || "C")[0].toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: COLORS.text,
                      }}
                    >
                      {u.name.split(" ")[0]} {isMe ? "(You)" : ""}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        fontWeight: "600",
                        marginTop: 1,
                      }}
                    >
                      {u.badge} Contributor
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "900",
                      color: isMe ? COLORS.primary : COLORS.success,
                    }}
                  >
                    {u.pts} PTS
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* NOTIFICATIONS VIEW */}
      {currentView === "notifications" && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={userRefreshing}
              onRefresh={handleRefresh}
              colors={["#db2777"]}
              tintColor={"#db2777"}
            />
          }
        >
          <View style={styles.dashboardSectionHeader}>
            <Text style={styles.dashboardHeaderTitle}>
              {t("Notifications")}
            </Text>
            <Text style={styles.dashboardHeaderSub}>
              Real-time activity dispatches synced straight from smartfix
              operations
            </Text>
          </View>

          <View style={{ marginTop: 20, gap: 14 }}>
            {dynamicNotifications.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 100,
                }}
              >
                <Bell
                  stroke={COLORS.textMuted}
                  size={48}
                  style={{ marginBottom: 15, opacity: 0.5 }}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: COLORS.text,
                    marginBottom: 4,
                  }}
                >
                  No active notifications yet.
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    textAlign: "center",
                    paddingHorizontal: 40,
                  }}
                >
                  Real-time ticket updates, technician dispatches, and loyalty
                  point rewards will synchronize here.
                </Text>
              </View>
            ) : (
              dynamicNotifications.map((notif, idx) => {
                const accentColor =
                  notif.type === "success"
                    ? COLORS.success
                    : notif.type === "assigned"
                      ? COLORS.secondary
                      : notif.type === "resolved"
                        ? "#06b6d4"
                        : COLORS.primary;

                return (
                  <View
                    key={notif.id || idx}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: 18,
                      borderWidth: 0.5,
                      borderColor: "rgba(30, 27, 75, 0.05)",
                      padding: 16,
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: accentColor,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {notif.type === "success" ? (
                        <Trophy stroke="#ffffff" size={16} />
                      ) : notif.type === "assigned" ? (
                        <User stroke="#ffffff" size={16} />
                      ) : notif.type === "resolved" ? (
                        <Sparkles stroke="#ffffff" size={16} />
                      ) : (
                        <Bell stroke="#ffffff" size={16} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: COLORS.text,
                          marginBottom: 4,
                        }}
                      >
                        {notif.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12.5,
                          color: COLORS.text,
                          lineHeight: 17,
                          fontWeight: "500",
                        }}
                      >
                        {notif.description}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: COLORS.textMuted,
                          marginTop: 6,
                          fontWeight: "700",
                          textTransform: "uppercase",
                        }}
                      >
                        {formatTimeAgo(notif.time)} •{" "}
                        {notif.time.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* COMPLAINTS LIST TRACKER (TRACK LIST SCREEN) */}
      {currentView === "complaints" && (
        <View style={styles.complaintsContainer}>
          <View style={styles.trackHeaderRow}>
            <TouchableOpacity
              style={styles.trackBackButton}
              onPress={() => setCurrentView("chat")}
            >
              <ChevronLeft stroke={COLORS.text} size={18} />
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}
              >
                Chat
              </Text>
            </TouchableOpacity>
            <Text style={styles.trackTitleText}>{t("Issue Tracker")}</Text>
          </View>

          {myRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Clock
                stroke={COLORS.textMuted}
                size={48}
                style={{ marginBottom: 15 }}
              />
              <Text style={styles.emptyText}>
                No active issues reported yet.
              </Text>
              <Text style={styles.emptySubtext}>
                Use the **SmartFix AI Bot** to register a utility issue.
              </Text>
            </View>
          ) : (
            <FlatList
              data={myRequests}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.trackerListScroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={userRefreshing}
                  onRefresh={handleRefresh}
                  colors={["#db2777"]}
                  tintColor={"#db2777"}
                />
              }
              renderItem={({ item }) => {
                const theme = getCategoryTheme(item.category);
                const activeStep = getActiveStepNumber(item.status);
                const stepNames = [
                  "Created",
                  "Assigned",
                  "Scheduled",
                  "Ongoing",
                  "Resolved",
                  "Feedback",
                ];
                const currentStepName = stepNames[activeStep - 1] || "Created";
                const ticketId = `#SF-${item._id ? item._id.substring(item._id.length - 6).toUpperCase() : "MOCK"}`;

                return (
                  <TouchableOpacity
                    style={[
                      styles.requestCard,
                      {
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        paddingVertical: 18,
                        paddingHorizontal: 16,
                      },
                    ]}
                    onPress={() => {
                      setSelectedIssue(item);
                      setActivePopupCard("issueDetails");
                    }}
                  >
                    <View style={styles.cardTop}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={[
                            styles.cardCategoryText,
                            {
                              color: theme.color,
                              fontSize: 10.5,
                              fontWeight: "900",
                            },
                          ]}
                        >
                          {theme.label.toUpperCase()}
                        </Text>
                        <View
                          style={{
                            backgroundColor: theme.textBg,
                            paddingHorizontal: 6,
                            paddingVertical: 1.5,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9.5,
                              fontWeight: "800",
                              color: theme.color,
                            }}
                          >
                            {ticketId}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === "Assigned" && styles.badgeAssigned,
                          item.status === "Resolved" && styles.badgeResolved,
                          item.status === "Pending" && styles.badgePending,
                          item.status === "Escalated" && styles.badgeEscalated,
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          },
                        ]}
                      >
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor:
                              item.status === "Resolved"
                                ? COLORS.success
                                : item.status === "Pending"
                                  ? COLORS.warning
                                  : item.status === "Escalated"
                                    ? COLORS.danger
                                    : COLORS.secondary,
                          }}
                        />
                        <Text style={styles.badgeText}>{item.status}</Text>
                      </View>
                    </View>

                    <Text style={styles.cardDescText} numberOfLines={2}>
                      {item.description}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: -4,
                        marginBottom: 12,
                      }}
                    >
                      <MapPin stroke={COLORS.textMuted} size={11} />
                      <Text
                        style={{
                          fontSize: 11,
                          color: COLORS.textMuted,
                          fontWeight: "600",
                        }}
                      >
                        {userZone + " jurisdiction"}
                      </Text>
                    </View>

                    {/* Miniature Progress Timeline */}
                    <View
                      style={{
                        marginBottom: 14,
                        backgroundColor: "rgba(30, 27, 75, 0.02)",
                        padding: 10,
                        borderRadius: 12,
                        borderWidth: 0.5,
                        borderColor: "rgba(30, 27, 75, 0.04)",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: "700",
                            color: COLORS.textMuted,
                          }}
                        >
                          Progress Status:{" "}
                          <Text
                            style={{ color: theme.color, fontWeight: "900" }}
                          >
                            {currentStepName}
                          </Text>
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "800",
                            color: COLORS.textMuted,
                          }}
                        >
                          STEP {activeStep}/6
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 5 }}>
                        {[1, 2, 3, 4, 5, 6].map((s) => (
                          <View
                            key={s}
                            style={{
                              flex: 1,
                              height: 5,
                              borderRadius: 2.5,
                              backgroundColor:
                                s <= activeStep
                                  ? theme.color
                                  : "rgba(30, 27, 75, 0.06)",
                            }}
                          />
                        ))}
                      </View>
                    </View>

                    <View style={styles.cardBottom}>
                      {item.partner &&
                      (typeof item.partner === "object"
                        ? item.partner.name
                        : item.partner) ? (
                        <View style={styles.partnerInfoRow}>
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              backgroundColor: theme.color,
                              justifyContent: "center",
                              alignItems: "center",
                              marginRight: 6,
                            }}
                          >
                            <Text
                              style={{
                                color: "#ffffff",
                                fontSize: 9,
                                fontWeight: "900",
                              }}
                            >
                              {String(
                                typeof item.partner === "object"
                                  ? item.partner.name || "T"
                                  : "P",
                              )[0].toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.partnerNameLabel}>
                            Tech:{" "}
                            {typeof item.partner === "object"
                              ? item.partner.name
                              : "Municipal Partner"}
                          </Text>
                        </View>
                      ) : item.status !== "Pending" ? (
                        <View style={styles.partnerInfoRow}>
                          <ShieldAlert
                            stroke={COLORS.warning}
                            size={12}
                            style={{ marginRight: 5 }}
                          />
                          <Text style={styles.partnerNameLabelMuted}>
                            Municipal Partner Assigned
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.partnerInfoRow} />
                      )}
                      <Text style={styles.cardDateText}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* CIVIC MEDIA FEED SCREEN */}
      {currentView === "media" && (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={mediaLoading}
              onRefresh={fetchMediaPosts}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Header Banner */}
          <View style={styles.dashboardSectionHeader}>
            <Text style={styles.dashboardHeaderTitle}>Civic Media</Text>
            <Text style={styles.dashboardHeaderSub}>
              Share, discuss, and inspire utility improvements in your
              neighborhood
            </Text>
          </View>

          {/* Create Post Card */}
          <View style={styles.createPostCard}>
            <View style={styles.createPostHeaderRow}>
              <View
                style={[
                  styles.profileAvatar,
                  {
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: COLORS.primary,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 10,
                  },
                ]}
              >
                <Text
                  style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}
                >
                  {(user?.name || "C")[0].toUpperCase()}
                </Text>
              </View>
              <TextInput
                style={styles.createPostInput}
                placeholder="What's happening in your neighborhood?"
                placeholderTextColor={COLORS.textMuted}
                value={mediaText}
                onChangeText={setMediaText}
                multiline
              />
            </View>

            {/* Selected Attachment Preview */}
            {(mediaImage || mediaVideo) && (
              <View style={styles.attachmentPreviewContainer}>
                <Image
                  source={{
                    uri:
                      mediaImage ||
                      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=400",
                  }}
                  style={styles.attachmentPreviewImage}
                />
                <TouchableOpacity
                  style={styles.removeAttachmentBtn}
                  onPress={() => {
                    setMediaImage(null);
                    setMediaVideo(null);
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: "900",
                    }}
                  >
                    X
                  </Text>
                </TouchableOpacity>
                {mediaVideo && (
                  <View style={styles.videoPreviewBadge}>
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 9,
                        fontWeight: "800",
                      }}
                    >
                      VIDEO PREVIEW
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.createPostActionsRow}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.mediaActionBtn,
                    mediaImage && styles.mediaActionBtnActive,
                  ]}
                  onPress={handleImageSelect}
                >
                  <ImageIcon
                    stroke={mediaImage ? COLORS.primary : COLORS.textMuted}
                    size={15}
                  />
                  <Text
                    style={[
                      styles.mediaActionBtnText,
                      mediaImage && { color: COLORS.primary },
                    ]}
                  >
                    Image
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.publishPostBtn}
                onPress={handleCreatePost}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.publishPostBtnText}>Post Feed</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Posts list */}
          {mediaLoading && mediaPosts.length === 0 ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 40 }}
            />
          ) : (
            mediaPosts.map((post) => {
              const isLikedByMe = post.likes.includes(user?.id);
              const commentsExpanded = !!mediaCommentsVisible[post._id];

              return (
                <View key={post._id} style={styles.mediaPostCard}>
                  {/* User Profile Header */}
                  <View style={styles.postHeaderRow}>
                    <View
                      style={[
                        styles.profileAvatar,
                        {
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: COLORS.secondary,
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 10,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: 16,
                          fontWeight: "900",
                        }}
                      >
                        {(post.userName || "C")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.postAuthorName}>{post.userName}</Text>
                      <Text style={styles.postTimeText}>
                        {new Date(post.createdAt).toLocaleDateString()} at{" "}
                        {new Date(post.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View style={styles.postLocationBadge}>
                      <MapPin
                        stroke={COLORS.primary}
                        size={10}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.postLocationBadgeText}>
                        {post.location.split(",")[0]}
                      </Text>
                    </View>
                  </View>

                  {/* Post Content */}
                  <Text style={styles.postContentText}>{post.text}</Text>

                  {/* Post Image/Video */}
                  {post.image && (
                    <View style={styles.postMediaContainer}>
                      <Image
                        source={{ uri: post.image }}
                        style={styles.postMediaImage}
                      />
                      {post.video && (
                        <View style={styles.postVideoOverlay}>
                          <LinearGradient
                            colors={["rgba(0,0,0,0.5)", "transparent"]}
                            style={styles.absoluteBackground}
                          />
                          <VideoIcon stroke="#ffffff" size={32} />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Interactions Action Bar */}
                  <View style={styles.postActionBar}>
                    <TouchableOpacity
                      style={styles.postActionItem}
                      onPress={() => handleLikePost(post._id)}
                    >
                      <Heart
                        stroke={isLikedByMe ? COLORS.primary : COLORS.textMuted}
                        fill={isLikedByMe ? COLORS.primary : "transparent"}
                        size={16}
                      />
                      <Text
                        style={[
                          styles.postActionText,
                          isLikedByMe && { color: COLORS.primary },
                        ]}
                      >
                        {post.likes.length} Likes
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.postActionItem}
                      onPress={() => {
                        setMediaCommentsVisible((prev) => ({
                          ...prev,
                          [post._id]: !prev[post._id],
                        }));
                      }}
                    >
                      <MessageCircle stroke={COLORS.textMuted} size={16} />
                      <Text style={styles.postActionText}>
                        {post.comments.length} Comments
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.postActionItem}
                      onPress={() => handleReportPost(post._id)}
                    >
                      <ShieldAlert stroke={COLORS.textMuted} size={16} />
                      <Text style={styles.postActionText}>Report</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Comments Section */}
                  {commentsExpanded && (
                    <View style={styles.commentsTray}>
                      <View style={styles.commentsDivider} />

                      {/* Comments List */}
                      {post.comments.map((comment, cIdx) => (
                        <View
                          key={comment._id || cIdx}
                          style={styles.commentRow}
                        >
                          <View
                            style={[
                              styles.profileAvatar,
                              {
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: COLORS.primary,
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 8,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: "#ffffff",
                                fontSize: 11,
                                fontWeight: "900",
                              }}
                            >
                              {(comment.userName || "C")[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.commentBubble}>
                            <Text style={styles.commentAuthorName}>
                              {comment.userName}
                            </Text>
                            <Text style={styles.commentTextContent}>
                              {comment.text}
                            </Text>
                          </View>
                        </View>
                      ))}

                      {/* Write Comment Capsule */}
                      <View style={styles.writeCommentCapsule}>
                        <TextInput
                          style={styles.commentInputBox}
                          placeholder="Write a comment..."
                          placeholderTextColor={COLORS.textMuted}
                          value={commentInputs[post._id] || ""}
                          onChangeText={(text) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post._id]: text,
                            }))
                          }
                          onSubmitEditing={() => handleAddComment(post._id)}
                        />
                        <TouchableOpacity
                          style={styles.sendCommentBtn}
                          onPress={() => handleAddComment(post._id)}
                        >
                          <Send stroke="#ffffff" size={10} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* SELECT PREVIOUS REQUEST POPUP */}
      {activePopupCard === "select_request" && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupCardHeader}>
            <Text style={styles.popupCardTitle}>Select Request to Track</Text>
            <TouchableOpacity
              style={styles.popupCardCloseBtn}
              onPress={() => setActivePopupCard(null)}
            >
              <Text
                style={{ fontSize: 12, fontWeight: "800", color: "#64748b" }}
              >
                X
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={{ color: "#64748b", marginBottom: 15 }}>
              Which ticket are you asking the AI about?
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {myRequests.map((req, i) => (
                <TouchableOpacity
                  key={i}
                  style={{
                    padding: 15,
                    backgroundColor: "#f8fafc",
                    marginBottom: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                  onPress={() => {
                    setActivePopupCard(null);
                    sendMessage(
                      `I am referring to my ${req.category.toUpperCase()} request (ID: ${req._id}) reported on ${new Date(req.createdAt).toLocaleDateString()}.`,
                    );
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "900",
                      color: "#0f172a",
                      marginBottom: 5,
                    }}
                  >
                    {req.category.toUpperCase()} ISSUE
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    {req.description.substring(0, 50)}...
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#10b981",
                      marginTop: 5,
                      fontWeight: "700",
                    }}
                  >
                    STATUS: {req.status}
                  </Text>
                </TouchableOpacity>
              ))}
              {myRequests.length === 0 && (
                <Text style={{ color: "#db2777", fontWeight: "bold" }}>
                  You have no previous requests.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ============================================================ */}
      {/* INTERACTIVE POPUP CARDS OVERLAY */}
      {/* ============================================================ */}

      {/* A. MAP PINNING POPUP OVERLAY */}
      {activePopupCard === "map" && (
        <View style={styles.popupCardOverlay}>
          <View style={{ flex: 1, backgroundColor: "#ffffff", paddingTop: 50 }}>
            <View style={[styles.popupCardHeader, { paddingHorizontal: 20 }]}>
              <Text style={styles.popupCardTitle}>Pin Issue Location</Text>
              <TouchableOpacity
                style={styles.popupCardCloseBtn}
                onPress={() => setActivePopupCard(null)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                  }}
                ></Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.popupCardSub,
                { paddingHorizontal: 20, marginBottom: 20 },
              ]}
            >
              Confirm the coordinates to dispatch your ticket immediately.
            </Text>

            {/* Ticket Photo Attachment Panel */}
            <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: 8,
                }}
              >
                📸 Attach Proof Photo (Optional)
              </Text>
              {!ticketImage ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={captureTicketImageFromCamera}
                    style={{
                      flex: 1,
                      backgroundColor: "#f1f5f9",
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#475569",
                      }}
                    >
                      Take Photo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickTicketImageFromGallery}
                    style={{
                      flex: 1,
                      backgroundColor: "#f1f5f9",
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#475569",
                      }}
                    >
                      Choose Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: "#f8fafc",
                    padding: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#cbd5e1",
                  }}
                >
                  <Image
                    source={{ uri: ticketImage }}
                    style={{ width: 50, height: 50, borderRadius: 6 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#10b981",
                      }}
                    >
                      ✓ Photo attached successfully
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTicketImage(null)}
                    style={{
                      backgroundColor: "#ef4444",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: "#ffffff",
                      }}
                    >
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View
              style={{
                flex: 1,
                width: "100%",
                borderRadius: 0,
                overflow: "hidden",
              }}
            >
              <LeafletMap
                latitude={userLat || user?.latitude || 13.0827}
                longitude={userLng || user?.longitude || 80.2707}
                onLocationConfirm={(lat, lng) => {
                  handleLocationConfirm(
                    lat,
                    lng,
                    activeReqCategory,
                    activeReqSummary,
                    activeReqTitle,
                  );
                  setActivePopupCard(null);
                  setCurrentView("chat");
                }}
              />
            </View>
          </View>
        </View>
      )}

      {/* B. PRIOR TICKET HISTORY POPUP OVERLAY */}

      {activePopupCard === "issueDetails" && selectedIssue && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupGlassCard}>
            <View style={styles.popupCardHeader}>
              <Text style={styles.popupCardTitle}>
                Ticket #{selectedIssue._id.substring(18)}
              </Text>
              <TouchableOpacity
                style={styles.popupCardCloseBtn}
                onPress={() => setActivePopupCard(null)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                  }}
                >
                  X
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {/* Category & Status */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    color: COLORS.text,
                  }}
                >
                  {selectedIssue.category.toUpperCase()} ISSUE
                </Text>
                <View
                  style={{
                    backgroundColor:
                      selectedIssue.status.toLowerCase() === "resolved"
                        ? "#d1fae5"
                        : "#fee2e2",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color:
                        selectedIssue.status.toLowerCase() === "resolved"
                          ? "#065f46"
                          : "#991b1b",
                    }}
                  >
                    {selectedIssue.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.6)",
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 15,
                  borderWidth: 1,
                  borderColor: "rgba(0, 0, 0, 0.05)",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                    marginBottom: 4,
                  }}
                >
                  DESCRIPTION
                </Text>
                <Text
                  style={{ fontSize: 14, color: COLORS.text, lineHeight: 20 }}
                >
                  {selectedIssue.description}
                </Text>

                {selectedIssue.citizenImage && (
                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 8,
                      overflow: "hidden",
                      height: 160,
                    }}
                  >
                    <Image
                      source={{ uri: selectedIssue.citizenImage }}
                      style={{
                        width: "100%",
                        height: "100%",
                        resizeMode: "cover",
                      }}
                    />
                  </View>
                )}
              </View>

              {/* Assigned Partner */}
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.6)",
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 15,
                  borderWidth: 1,
                  borderColor: "rgba(0, 0, 0, 0.05)",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                    marginBottom: 8,
                  }}
                >
                  ASSIGNED TECHNICIAN
                </Text>
                {selectedIssue.partner ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: COLORS.primary,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        {(typeof selectedIssue.partner === "object"
                          ? selectedIssue.partner.name
                          : "M")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          color: COLORS.text,
                          fontWeight: "700",
                        }}
                      >
                        {typeof selectedIssue.partner === "object"
                          ? selectedIssue.partner.name
                          : "Municipal Partner"}
                      </Text>
                      {typeof selectedIssue.partner === "object" &&
                        selectedIssue.partner.partnerCategory && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: COLORS.secondary,
                              fontWeight: "600",
                              marginTop: 1,
                              textTransform: "uppercase",
                            }}
                          >
                            Specialty: {selectedIssue.partner.partnerCategory}
                          </Text>
                        )}
                      {typeof selectedIssue.partner === "object" &&
                      selectedIssue.partner.phone ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: COLORS.textMuted,
                            marginTop: 2,
                          }}
                        >
                          Phone: {selectedIssue.partner.phone}
                        </Text>
                      ) : (
                        <Text
                          style={{
                            fontSize: 12,
                            color: COLORS.textMuted,
                            marginTop: 2,
                          }}
                        >
                          Phone: Not provided
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      color: COLORS.text,
                      fontWeight: "600",
                    }}
                  >
                    Awaiting Dispatch...
                  </Text>
                )}
              </View>

              {/* Resolution Verification info */}
              {(selectedIssue.status === "Resolved" ||
                selectedIssue.status === "Done") && (
                <View
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    padding: 14,
                    borderRadius: 12,
                    marginBottom: 15,
                    borderWidth: 1,
                    borderColor: "rgba(16, 185, 129, 0.15)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#10b981",
                      marginBottom: 8,
                    }}
                  >
                    RESOLUTION VERIFICATION
                  </Text>
                  {selectedIssue.resolutionImage ? (
                    <View
                      style={{
                        borderRadius: 8,
                        overflow: "hidden",
                        marginBottom: 8,
                        height: 160,
                        backgroundColor: "#f3f4f6",
                      }}
                    >
                      <Image
                        source={{ uri: selectedIssue.resolutionImage }}
                        style={{
                          width: "100%",
                          height: "100%",
                          resizeMode: "cover",
                        }}
                      />
                      {/* Telemetry coordinate tag overlaid on bottom of image */}
                      <View
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: "rgba(0, 0, 0, 0.6)",
                          padding: 6,
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 9,
                            fontWeight: "bold",
                          }}
                        >
                          GPS: {selectedIssue.resolutionLatitude?.toFixed(4)},{" "}
                          {selectedIssue.resolutionLongitude?.toFixed(4)}
                        </Text>
                        <Text
                          style={{
                            color: "#10b981",
                            fontSize: 9,
                            fontWeight: "bold",
                          }}
                        >
                          SECURE VERIFIED
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        fontStyle: "italic",
                        marginBottom: 4,
                      }}
                    >
                      Verified completion recorded by technician.
                    </Text>
                  )}
                  {selectedIssue.resolvedAt && (
                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                      Resolved at:{" "}
                      {new Date(selectedIssue.resolvedAt).toLocaleString()}
                    </Text>
                  )}
                  {selectedIssue.resolutionLocationName && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        marginTop: 4,
                      }}
                    >
                      Location: {selectedIssue.resolutionLocationName}
                    </Text>
                  )}
                </View>
              )}

              {/* Roadmap */}
              <View style={styles.roadmapCard}>
                <Text style={styles.roadmapTitle}>TRACK ROADMAP</Text>
                {[
                  {
                    id: 1,
                    label: "Issue Created",
                    desc: "Your report has been successfully logged.",
                  },
                  {
                    id: 2,
                    label: "Issue Assigned",
                    desc: "A service partner is assigned to inspect.",
                  },
                  {
                    id: 3,
                    label: "Issue Scheduled",
                    desc: "Technician scheduled the resolution.",
                  },
                  {
                    id: 4,
                    label: "Issue Ongoing",
                    desc: "Technician is actively working on the resolution.",
                  },
                  {
                    id: 5,
                    label: "Issue Resolved",
                    desc: "The issue has been completely fixed.",
                  },
                  {
                    id: 6,
                    label: "Feedback",
                    desc: "Let us know your rating & experience.",
                  },
                ].map((step, index) => {
                  const stepStatus = getStepStatus(
                    selectedIssue.status,
                    step.id,
                  );
                  const isLast = index === 5;

                  return (
                    <View key={step.id} style={styles.roadmapStepRow}>
                      <View style={styles.roadmapLeftCol}>
                        <View
                          style={[
                            styles.roadmapCircle,
                            stepStatus === "completed" &&
                              styles.roadmapCircleCompleted,
                            stepStatus === "active" &&
                              styles.roadmapCircleActive,
                            stepStatus === "pending" &&
                              styles.roadmapCirclePending,
                          ]}
                        >
                          {stepStatus === "completed" ? (
                            <Text style={styles.roadmapCheckmark}>✓</Text>
                          ) : (
                            <View
                              style={[
                                styles.roadmapDot,
                                stepStatus === "active" &&
                                  styles.roadmapDotActive,
                                stepStatus === "pending" &&
                                  styles.roadmapDotPending,
                              ]}
                            />
                          )}
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.roadmapLine,
                              stepStatus === "completed" &&
                                styles.roadmapLineCompleted,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.roadmapRightCol}>
                        <Text
                          style={[
                            styles.roadmapStepLabel,
                            stepStatus === "active" &&
                              styles.roadmapStepLabelActive,
                            stepStatus === "completed" &&
                              styles.roadmapStepLabelCompleted,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.roadmapStepDesc}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Rating Feedback Panel (Visible only when ticket status is Resolved or Done) */}
              {(selectedIssue.status === "Resolved" ||
                selectedIssue.status === "Done") &&
                !selectedIssue.rating && (
                  <View
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.75)",
                      padding: 16,
                      borderRadius: 12,
                      marginBottom: 15,
                      borderWidth: 1,
                      borderColor: "rgba(99, 102, 241, 0.15)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: "#6366f1",
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      🌟 Rate Municipal Service
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        marginBottom: 12,
                      }}
                    >
                      Please rate your experience with this resolution to help
                      us reward our technician.
                    </Text>

                    {/* Star Rating Row */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        justifyContent: "center",
                        marginBottom: 15,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => setRatingVal(star)}
                        >
                          <Star
                            stroke={star <= ratingVal ? "#eab308" : "#cbd5e1"}
                            fill={star <= ratingVal ? "#eab308" : "none"}
                            size={32}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Feedback Text Input */}
                    <TextInput
                      value={feedbackComment}
                      onChangeText={setFeedbackComment}
                      placeholder="Type an optional comment..."
                      placeholderTextColor="#94a3b8"
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#cbd5e1",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#1e293b",
                        marginBottom: 12,
                        textAlignVertical: "top",
                        minHeight: 60,
                      }}
                      multiline
                    />

                    {/* Submit Feedback Button */}
                    <TouchableOpacity
                      onPress={() => handleFeedbackSubmit(selectedIssue._id)}
                      disabled={loading}
                      style={{
                        backgroundColor: "#6366f1",
                        paddingVertical: 12,
                        borderRadius: 8,
                        alignItems: "center",
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: "#ffffff",
                          }}
                        >
                          Submit Feedback & Close Ticket
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

              {/* Timeline */}
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.75)",
                  padding: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(99, 102, 241, 0.1)",
                  marginBottom: 15,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: "#6366f1",
                    marginBottom: 14,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  🕒 Detailed Timeline Logs
                </Text>

                {/* 1. Created Log */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ width: 18, alignItems: "center" }}>
                    <Text
                      style={{
                        color: "#10b981",
                        fontSize: 14,
                        fontWeight: "bold",
                      }}
                    >
                      ✓
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "700",
                        color: COLORS.text,
                      }}
                    >
                      Issue Logged
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        marginTop: 2,
                      }}
                    >
                      Successfully recorded in municipal console. (
                      {new Date(selectedIssue.createdAt).toLocaleString()})
                    </Text>
                  </View>
                </View>

                {/* 2. Assigned Log */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ width: 18, alignItems: "center" }}>
                    {selectedIssue.partner ? (
                      <Text
                        style={{
                          color: "#10b981",
                          fontSize: 14,
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </Text>
                    ) : (
                      <Text
                        style={{
                          color: "#6366f1",
                          fontSize: 13,
                          fontWeight: "bold",
                        }}
                      >
                        ●
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "700",
                        color: selectedIssue.partner
                          ? COLORS.text
                          : COLORS.textMuted,
                      }}
                    >
                      Technician Matched {!selectedIssue.partner && " (Active)"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {selectedIssue.partner
                        ? `Technician ${typeof selectedIssue.partner === "object" ? selectedIssue.partner.name : "Municipal Partner"} assigned to investigate. (${selectedIssue.assignedAt ? new Date(selectedIssue.assignedAt).toLocaleString() : new Date(new Date(selectedIssue.createdAt).getTime() + 120000).toLocaleString()})`
                        : "Seeking available local service partners in Chennai..."}
                    </Text>
                  </View>
                </View>

                {/* 3. Scheduled Log */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ width: 18, alignItems: "center" }}>
                    {selectedIssue.scheduledDate ? (
                      <Text
                        style={{
                          color: "#10b981",
                          fontSize: 14,
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </Text>
                    ) : selectedIssue.status === "Assigned" ? (
                      <Text
                        style={{
                          color: "#6366f1",
                          fontSize: 13,
                          fontWeight: "bold",
                        }}
                      >
                        ●
                      </Text>
                    ) : (
                      <Text style={{ color: "#cbd5e1", fontSize: 13 }}>○</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "700",
                        color: selectedIssue.scheduledDate
                          ? COLORS.text
                          : COLORS.textMuted,
                      }}
                    >
                      Visit Scheduled{" "}
                      {selectedIssue.status === "Assigned" && " (Active)"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {selectedIssue.scheduledDate
                        ? `Technician booked site arrival for ${new Date(selectedIssue.scheduledDate).toLocaleDateString()} at ${selectedIssue.scheduledTime || "10:00 AM"}.`
                        : selectedIssue.status === "Assigned"
                          ? "Technician is coordinating the scheduled visit date and time slot."
                          : "Awaiting technician assignment before booking visit slot."}
                    </Text>
                  </View>
                </View>

                {/* 4. Ongoing Log */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ width: 18, alignItems: "center" }}>
                    {["in progress", "resolved", "done"].includes(
                      (selectedIssue.status || "").toLowerCase(),
                    ) ? (
                      <Text
                        style={{
                          color: "#10b981",
                          fontSize: 14,
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </Text>
                    ) : selectedIssue.status === "Scheduled" ? (
                      <Text
                        style={{
                          color: "#6366f1",
                          fontSize: 13,
                          fontWeight: "bold",
                        }}
                      >
                        ●
                      </Text>
                    ) : (
                      <Text style={{ color: "#cbd5e1", fontSize: 13 }}>○</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "700",
                        color: ["in progress", "resolved", "done"].includes(
                          (selectedIssue.status || "").toLowerCase(),
                        )
                          ? COLORS.text
                          : COLORS.textMuted,
                      }}
                    >
                      Operations Initiated{" "}
                      {selectedIssue.status === "Scheduled" && " (Active)"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {["in progress", "resolved", "done"].includes(
                        (selectedIssue.status || "").toLowerCase(),
                      )
                        ? "Technician initiated active repair, diagnostics and clean-up operations on site."
                        : selectedIssue.status === "Scheduled"
                          ? "Technician preparing site logistics and tools to begin active repairs."
                          : "Awaiting scheduled date to initiate operations."}
                    </Text>
                  </View>
                </View>

                {/* 5. Resolved Log */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ width: 18, alignItems: "center" }}>
                    {selectedIssue.resolvedAt ||
                    ["resolved", "done"].includes(
                      (selectedIssue.status || "").toLowerCase(),
                    ) ? (
                      <Text
                        style={{
                          color: "#10b981",
                          fontSize: 14,
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </Text>
                    ) : selectedIssue.status === "In Progress" ? (
                      <Text
                        style={{
                          color: "#6366f1",
                          fontSize: 13,
                          fontWeight: "bold",
                        }}
                      >
                        ●
                      </Text>
                    ) : (
                      <Text style={{ color: "#cbd5e1", fontSize: 13 }}>○</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "700",
                        color:
                          selectedIssue.resolvedAt ||
                          ["resolved", "done"].includes(
                            (selectedIssue.status || "").toLowerCase(),
                          )
                            ? COLORS.text
                            : COLORS.textMuted,
                      }}
                    >
                      Fixed & Resolved{" "}
                      {selectedIssue.status === "In Progress" && " (Active)"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {selectedIssue.resolvedAt ||
                      ["resolved", "done"].includes(
                        (selectedIssue.status || "").toLowerCase(),
                      )
                        ? `Resolved successfully. Verified photo proof uploaded. (${selectedIssue.resolvedAt ? new Date(selectedIssue.resolvedAt).toLocaleString() : new Date().toLocaleString()})`
                        : selectedIssue.status === "In Progress"
                          ? "Technician is actively carrying out repairs and completing task."
                          : "Awaiting resolution completion by technician."}
                    </Text>
                  </View>
                </View>

                {/* 6. Feedback Rating Log */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ width: 18, alignItems: "center" }}>
                    {selectedIssue.rating ? (
                      <Text
                        style={{
                          color: "#10b981",
                          fontSize: 14,
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </Text>
                    ) : selectedIssue.status === "Resolved" ? (
                      <Text
                        style={{
                          color: "#6366f1",
                          fontSize: 13,
                          fontWeight: "bold",
                        }}
                      >
                        ●
                      </Text>
                    ) : (
                      <Text style={{ color: "#cbd5e1", fontSize: 13 }}>○</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: "700",
                        color: selectedIssue.rating
                          ? COLORS.text
                          : COLORS.textMuted,
                      }}
                    >
                      Feedback Recorded{" "}
                      {selectedIssue.status === "Resolved" && " (Active)"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: COLORS.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {selectedIssue.rating
                        ? `Rated ${selectedIssue.rating} / 5 Stars. Comment: "${selectedIssue.feedback || "No comments"}"`
                        : selectedIssue.status === "Resolved"
                          ? "Issue resolved! Review and rating feedback requested from citizen."
                          : "Awaiting rating feedback and ticket closure."}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {activePopupCard === "history" && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupGlassCard}>
            <View style={styles.popupCardHeader}>
              <Text style={styles.popupCardTitle}>Your Complaint History</Text>
              <TouchableOpacity
                style={styles.popupCardCloseBtn}
                onPress={() => setActivePopupCard(null)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                  }}
                >
                  X
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.popupCardSub}>
              Scroll through prior active and completed tickets.
            </Text>

            <ScrollView
              contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {myRequests.map((req, i) => (
                <View key={req._id || i} style={styles.popupRequestItem}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.popupCategoryText}>
                      {req.category?.toUpperCase() || "GENERAL"}
                    </Text>
                    <Text style={styles.popupStatusText}>
                      {req.status || "Assigned"}
                    </Text>
                  </View>
                  <Text style={styles.popupDescText} numberOfLines={2}>
                    {req.description}
                  </Text>
                  <Text style={styles.popupDateText}>
                    Logged on {new Date(req.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* C. TECHNICIAN DISPATCH POPUP OVERLAY */}
      {activePopupCard === "dispatch" && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupGlassCard}>
            <View style={styles.popupCardHeader}>
              <Text style={styles.popupCardTitle}>
                Technician Dispatch Status
              </Text>
              <TouchableOpacity
                style={styles.popupCardCloseBtn}
                onPress={() => setActivePopupCard(null)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: COLORS.textMuted,
                  }}
                >
                  X
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{ paddingVertical: 15, alignItems: "center", gap: 14 }}
            >
              <LinearGradient
                colors={["#db2777", "#a855f7"]}
                style={styles.dispatchStatusIconBox}
              >
                <User stroke="#ffffff" size={32} />
              </LinearGradient>

              <View style={{ alignItems: "center" }}>
                <Text style={styles.dispatchNameText}>
                  CleanGreen Dispatch Team
                </Text>
                <Text style={styles.dispatchSubText}>
                  Executive Municipal Partner Assigned
                </Text>
              </View>

              <View style={styles.dispatchDetailCard}>
                <View style={styles.dispatchRow}>
                  <Text style={styles.dispatchLabel}>Priority Level</Text>
                  <Text style={[styles.dispatchVal, { color: COLORS.primary }]}>
                    HIGH PRIORITY
                  </Text>
                </View>
                <View style={styles.dispatchDivider} />
                <View style={styles.dispatchRow}>
                  <Text style={styles.dispatchLabel}>Resolution SLA</Text>
                  <Text style={styles.dispatchVal}>4 Hours Guarantee</Text>
                </View>
                <View style={styles.dispatchDivider} />
                <View style={styles.dispatchRow}>
                  <Text style={styles.dispatchLabel}>Zone Office</Text>
                  <Text style={styles.dispatchVal}>Zone 13, Chennai</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.dispatchContactBtn}
                onPress={() => setActivePopupCard(null)}
              >
                <Text style={styles.dispatchContactBtnText}>
                  Alert Assigned Crew
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 5. PREMIUM DRAWER MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDrawerOpen}
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.drawerModalOverlay}>
          <TouchableOpacity
            style={styles.drawerOverlayDismiss}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />

          <LinearGradient
            colors={["#ffffff", "#fdf4f9", "#f2f3fe"]}
            style={styles.drawerContent}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandBox}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.drawerBrandAvatarImage}
                />
                <Text style={styles.drawerBrandText}>Smart Fix</Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setIsDrawerOpen(false)}
              >
                <Text style={styles.drawerCloseText}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerDivider} />

            <ScrollView
              style={styles.drawerScroll}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  currentView === "chat" && styles.activeDrawerItem,
                ]}
                onPress={() => {
                  setCurrentView("chat");
                  setIsDrawerOpen(false);
                }}
              >
                <MessageSquareCode
                  stroke={currentView === "chat" ? COLORS.primary : COLORS.text}
                  size={18}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    currentView === "chat" && styles.activeDrawerItemText,
                  ]}
                >
                  AI Assistant Chat
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  currentView === "home" && styles.activeDrawerItem,
                ]}
                onPress={() => {
                  setCurrentView("home");
                  setIsDrawerOpen(false);
                }}
              >
                <Bot
                  stroke={currentView === "home" ? COLORS.primary : COLORS.text}
                  size={18}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    currentView === "home" && styles.activeDrawerItemText,
                  ]}
                >
                  Civic Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  currentView === "complaints" && styles.activeDrawerItem,
                ]}
                onPress={() => {
                  setCurrentView("complaints");
                  setIsDrawerOpen(false);
                }}
              >
                <Clock
                  stroke={
                    currentView === "complaints" ? COLORS.primary : COLORS.text
                  }
                  size={18}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    currentView === "complaints" && styles.activeDrawerItemText,
                  ]}
                >
                  Track Tickets
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  currentView === "media" && styles.activeDrawerItem,
                ]}
                onPress={() => {
                  setCurrentView("media");
                  setIsDrawerOpen(false);
                }}
              >
                <Sparkles
                  stroke={
                    currentView === "media" ? COLORS.primary : COLORS.text
                  }
                  size={18}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    currentView === "media" && styles.activeDrawerItemText,
                  ]}
                >
                  Civic Media
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.drawerItem,
                  currentView === "leaderboard" && styles.activeDrawerItem,
                ]}
                onPress={() => {
                  setCurrentView("leaderboard");
                  setIsDrawerOpen(false);
                }}
              >
                <Trophy
                  stroke={currentView === "leaderboard" ? "#db2777" : "#0f172a"}
                  size={18}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    currentView === "leaderboard" &&
                      styles.activeDrawerItemText,
                  ]}
                >
                  {t("Civic Leaderboard")}
                </Text>
              </TouchableOpacity>

              <View style={styles.drawerSubDivider} />

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  handleResetChat(activeBot);
                  setIsDrawerOpen(false);
                }}
              >
                <RefreshCw stroke={COLORS.primary} size={16} />
                <Text
                  style={[styles.drawerItemText, { color: COLORS.primary }]}
                >
                  Reset AI Conversation
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.drawerLogoutButton}
              onPress={() => {
                setIsDrawerOpen(false);
                logout();
              }}
            >
              <Text style={styles.drawerLogoutText}>Log Out Account</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* 6. PREMIUM PROFILE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isProfileOpen}
        onRequestClose={() => setIsProfileOpen(false)}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.modalDragIndicator} />

            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>Citizen Identity</Text>
              <TouchableOpacity
                style={styles.profileCloseBtn}
                onPress={() => setIsProfileOpen(false)}
              >
                <Text style={styles.profileCloseText}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileModalBody}>
              <View style={styles.profileModalAvatarWrapper}>
                <View
                  style={[
                    styles.profileModalAvatar,
                    {
                      backgroundColor: COLORS.primary,
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 40,
                      fontWeight: "900",
                    }}
                  >
                    {(user?.name || "C")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileModalGlowRing} />
              </View>

              <Text style={styles.profileModalName}>
                {user?.name || "Citizen Contributor"}
              </Text>
              <Text style={styles.profileModalEmail}>
                {user?.email || "citizen@smartfix.com"}
              </Text>

              <View style={styles.profileBadgePill}>
                <Text style={styles.profileBadgePillText}>
                  {myBadge.toUpperCase()} TIER CONTRIBUTOR
                </Text>
              </View>

              <View style={styles.profileDetailsCard}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Zone Jurisdiction</Text>
                  <Text style={styles.detailItemValue}>{userZone}</Text>
                </View>
                <View style={styles.detailItemDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>
                    Civic Loyalty Points
                  </Text>
                  <Text style={styles.detailItemValue}>
                    {myCivicPoints} PTS
                  </Text>
                </View>
                <View style={styles.detailItemDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Reports Logged</Text>
                  <Text style={styles.detailItemValue}>
                    {String((myRequests || []).length).padStart(2, "0")}{" "}
                    Registered
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.profileModalLogoutBtn}
                onPress={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
              >
                <Text style={styles.profileModalLogoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast is now rendered inline inside the Chat Input Capsule */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  absoluteBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(30, 27, 75, 0.04)",
    zIndex: 10,
  },
  navLeftWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hamburgerButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  greetingHeaderBox: {
    justifyContent: "center",
  },
  dynamicGreetingText: {
    color: COLORS.text,
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  greetingSubLabel: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 1,
  },
  navRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  bellRedDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  avatarWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#ffffff",
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 110,
  },
  dashboardSectionHeader: {
    marginBottom: 18,
  },
  dashboardHeaderTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  dashboardHeaderSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  civicStatsCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    padding: 20,
    marginBottom: 24,
    shadowColor: "rgba(219, 39, 119, 0.05)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },
  civicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  civicIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "rgba(0,0,0,0.02)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  civicTextGroup: {
    flex: 1,
  },
  civicPointsValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  civicPointsLabel: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  statsSeparator: {
    height: 1,
    backgroundColor: "rgba(30, 27, 75, 0.04)",
    marginVertical: 16,
  },
  statsMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statMiniCol: {
    alignItems: "center",
    flex: 1,
  },
  statMiniVal: {
    color: COLORS.text,
    fontSize: 15.5,
    fontWeight: "800",
  },
  statMiniLbl: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },
  metricSection: {
    marginBottom: 24,
  },
  metricSectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  healthIndexBox: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  healthScoreText: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
  },
  healthLabelText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  recentReportsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  recentReportsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: "800",
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  historyIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
  },
  historyText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  historySubtext: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  chatScroll: {
    flexGrow: 1,
    padding: 22,
    gap: 18,
    paddingBottom: 20,
  },
  askMeThemeContainer: {
    alignItems: "center",
    paddingVertical: 10,
    width: "100%",
  },
  askMeHeader: {
    marginBottom: 16,
  },
  askMeMainText: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  askMeHighlightText: {
    color: COLORS.primary,
  },
  listeningSphereWrapper: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: 15,
  },
  floatingSphereImage: {
    width: 120,
    height: 120,
    zIndex: 5,
  },
  spherePulsingRing1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "rgba(219, 39, 119, 0.08)",
    backgroundColor: "rgba(219, 39, 119, 0.02)",
  },
  spherePulsingRing2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.04)",
    backgroundColor: "transparent",
  },
  botSwitcherCapsuleBar: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 27, 75, 0.04)",
    borderRadius: 20,
    padding: 4,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.02)",
    width: "100%",
    justifyContent: "space-between",
  },
  botSwitcherPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  activeBotSwitcherPill: {
    backgroundColor: "#ffffff",
    shadowColor: "rgba(0, 0, 0, 0.02)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  botSwitcherLabel: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
  },
  activeBotSwitcherLabel: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  botIntroText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 10,
  },
  quickChip: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  quickChipText: {
    color: COLORS.text,
    fontSize: 11.5,
    fontWeight: "700",
  },
  messageRow: {
    width: "100%",
  },
  aiMsgWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "90%",
  },
  aiSphereAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
  },
  aiAvatarGradient: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  aiBubble: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  aiText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  bubbleActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.03)",
    paddingTop: 8,
  },
  bubbleActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "rgba(30,27,75,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  userMsgWrapper: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "85%",
  },
  userBubble: {
    flex: 1,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  userText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  userAvatarRight: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  inlineMapCard: {
    marginTop: 14,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(30,27,75,0.05)",
    padding: 10,
    overflow: "hidden",
  },
  mapCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  mapCardTitle: {
    color: COLORS.text,
    fontSize: 11.5,
    fontWeight: "800",
  },
  fallbackOptionBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  fallbackBtnYes: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  fallbackBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },
  fallbackBtnNo: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(30, 27, 75, 0.05)",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  fallbackBtnTextNo: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
  },
  chatInputCapsuleContainer: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  chatInputCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(254, 244, 248, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(219, 39, 119, 0.1)",
    borderRadius: 26,
    height: 52,
    paddingHorizontal: 12,
    shadowColor: "rgba(219, 39, 119, 0.05)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  attachmentBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  textInputStyle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: "600",
    paddingHorizontal: 10,
  },
  micCapsuleBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  sendCapsuleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  voicePulseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  voicePulseContainer: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
    alignItems: "center",
  },
  voiceModeTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  languageBarContainer: {
    width: "100%",
    height: 38,
    marginBottom: 12,
  },
  languageScroll: {
    gap: 8,
    alignItems: "center",
    paddingRight: 10,
  },
  languagePill: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeLanguagePill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  activeLanguageText: {
    color: "#ffffff",
  },
  captionsContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    minHeight: 180,
  },
  captionsScroll: {
    flex: 1,
  },
  captionsPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  placeholderCaptionText: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "600",
  },
  speechUserRow: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "flex-end",
    maxWidth: "85%",
  },
  speechUserAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(30, 27, 75, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  speechUserBubble: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    borderTopRightRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  speechUserText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  speechAiRow: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  speechAiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(219, 39, 119, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  speechAiBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
    borderRadius: 14,
    borderTopLeftRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  speechAiBubbleProcessing: {
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
    borderRadius: 14,
    borderTopLeftRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  processingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  speechAiText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  soundWaveWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    gap: 6,
    marginVertical: 20,
  },
  soundBarItem: {
    width: 6,
    height: 24,
    borderRadius: 3,
  },
  voiceRecordBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 10,
  },
  voiceHelpButtonSection: {
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  sessionStateText: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  floatingActionTriggersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  triggerPillBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.08)",
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: "center",
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  activeTriggerPill: {
    backgroundColor: "#db2777",
    borderColor: "#db2777",
  },
  triggerPillText: {
    color: COLORS.text,
    fontSize: 11.5,
    fontWeight: "700",
  },
  popupCardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(30, 27, 75, 0.35)",
    justifyContent: "flex-end",
    zIndex: 9999,
  },
  popupGlassCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 25,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  popupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  popupCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  popupCardCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(30, 27, 75, 0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupCardSub: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
    marginBottom: 14,
  },
  popupCardMapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(30,27,75,0.06)",
  },
  popupRequestItem: {
    backgroundColor: "rgba(30, 27, 75, 0.02)",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.04)",
    borderRadius: 14,
    padding: 12,
  },
  popupCategoryText: {
    color: COLORS.primary,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  popupStatusText: {
    color: COLORS.secondary,
    fontSize: 9.5,
    fontWeight: "700",
  },
  popupDescText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 16,
  },
  popupDateText: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 6,
  },
  dispatchStatusIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dispatchNameText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "850",
  },
  dispatchSubText: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  dispatchDetailCard: {
    width: "100%",
    backgroundColor: "rgba(30, 27, 75, 0.02)",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.04)",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginTop: 10,
  },
  dispatchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dispatchLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  dispatchVal: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  dispatchDivider: {
    height: 0.5,
    backgroundColor: "rgba(30, 27, 75, 0.04)",
  },
  dispatchContactBtn: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginTop: 10,
  },
  dispatchContactBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  complaintsContainer: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  trackHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  trackBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
  },
  trackTitleText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  trackAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  trackerListScroll: {
    gap: 12,
    paddingBottom: 110,
  },
  requestCard: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    padding: 16,
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardCategoryText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeAssigned: {
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    borderWidth: 0.5,
    borderColor: COLORS.secondary,
  },
  badgeResolved: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 0.5,
    borderColor: COLORS.success,
  },
  badgePending: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 0.5,
    borderColor: COLORS.warning,
  },
  badgeEscalated: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 0.5,
    borderColor: COLORS.danger,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardDescText: {
    color: COLORS.text,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.03)",
    paddingTop: 10,
  },
  partnerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  partnerNameLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  partnerNameLabelMuted: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: "700",
  },
  cardDateText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  bottomTabBar: {
    position: "absolute",
    bottom: 24,
    left: 22,
    right: 22,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "rgba(219, 39, 119, 0.04)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 999,
  },
  tabBarItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabBarLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  activeTabBarLabel: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  centerSphereTrigger: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: -20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  centerSphereGrad: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  greetingTimeText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greetingNameText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  drawerModalOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(30, 27, 75, 0.45)",
  },
  drawerOverlayDismiss: {
    flex: 1,
  },
  drawerContent: {
    width: 280,
    height: "100%",
    paddingTop: Platform.OS === "ios" ? 60 : 30,
    paddingHorizontal: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  drawerBrandBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerBrandSphere: {
    width: 32,
    height: 32,
  },
  drawerBrandGradient: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerBrandText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  drawerCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(30, 27, 75, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerCloseText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "800",
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "rgba(30, 27, 75, 0.05)",
    marginBottom: 20,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 8,
  },
  activeDrawerItem: {
    backgroundColor: "rgba(219, 39, 119, 0.06)",
  },
  drawerItemText: {
    fontSize: 13.5,
    color: COLORS.text,
    fontWeight: "700",
  },
  activeDrawerItemText: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  drawerSubDivider: {
    height: 1,
    backgroundColor: "rgba(30, 27, 75, 0.03)",
    marginVertical: 16,
    marginHorizontal: 12,
  },
  drawerLogoutButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.02)",
    justifyContent: "center",
    alignItems: "center",
  },
  drawerLogoutText: {
    color: COLORS.danger,
    fontSize: 13.5,
    fontWeight: "800",
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 27, 75, 0.45)",
    justifyContent: "flex-end",
  },
  profileModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(30, 27, 75, 0.08)",
    alignSelf: "center",
    marginBottom: 20,
  },
  profileModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  profileModalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  profileCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(30, 27, 75, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCloseText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "800",
  },
  profileModalBody: {
    alignItems: "center",
  },
  profileModalAvatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: "relative",
    marginBottom: 16,
  },
  profileModalAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
  },
  profileModalGlowRing: {
    position: "absolute",
    left: -6,
    top: -6,
    right: -6,
    bottom: -6,
    borderRadius: 51,
    borderWidth: 2,
    borderColor: "rgba(219, 39, 119, 0.15)",
  },
  profileModalName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  profileModalEmail: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 16,
  },
  profileBadgePill: {
    backgroundColor: "rgba(219, 39, 119, 0.06)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "rgba(219, 39, 119, 0.15)",
    marginBottom: 24,
  },
  profileBadgePillText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  profileDetailsCard: {
    width: "100%",
    backgroundColor: "rgba(30, 27, 75, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(30, 27, 75, 0.03)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 28,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailItemLabel: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
  },
  detailItemValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  detailItemDivider: {
    height: 1,
    backgroundColor: "rgba(30, 27, 75, 0.03)",
    marginVertical: 12,
  },
  profileModalLogoutBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileModalLogoutBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  aiBotAvatarImage: {
    width: 30,
    height: 30,
    backgroundColor: "transparent",
    resizeMode: 'contain',
  },
  drawerBrandAvatarImage: {
    width: 32,
    height: 32,
    backgroundColor: "transparent",
    resizeMode: 'contain',
  },
  likedActionBtn: {
    backgroundColor: "#db2777",
    borderColor: "#db2777",
  },
  speakingActionBtn: {
    backgroundColor: "#a855f7",
    borderColor: "#a855f7",
  },
  feedbackOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(254, 244, 248, 0.96)",
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  feedbackInputText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  roadmapCard: {
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderRadius: 16,
    padding: 16,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  roadmapTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  roadmapStepRow: {
    flexDirection: "row",
    minHeight: 56,
  },
  roadmapLeftCol: {
    alignItems: "center",
    marginRight: 12,
    width: 20,
  },
  roadmapCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  roadmapCircleCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roadmapCircleActive: {
    backgroundColor: "#ffffff",
    borderColor: COLORS.secondary,
  },
  roadmapCirclePending: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
  },
  roadmapCheckmark: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 12,
  },
  roadmapDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roadmapDotActive: {
    backgroundColor: COLORS.secondary,
  },
  roadmapDotPending: {
    backgroundColor: "#cbd5e1",
  },
  roadmapLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#cbd5e1",
    marginVertical: 2,
  },
  roadmapLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  roadmapRightCol: {
    flex: 1,
    paddingBottom: 10,
  },
  roadmapStepLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  roadmapStepLabelActive: {
    color: COLORS.secondary,
    fontWeight: "900",
  },
  roadmapStepLabelCompleted: {
    color: "#0f172a",
  },
  roadmapStepDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  civicScorecardContainer: {
    marginBottom: 16,
  },
  civicPointsStatsCard: {
    borderRadius: 16,
    padding: 18,
    shadowColor: COLORS.primaryGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  civicCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  civicPointsTitle: {
    fontSize: 10.5,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "900",
    letterSpacing: 1,
  },
  civicPointsValueText: {
    fontSize: 26,
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 4,
  },
  civicBadgePillContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  civicBadgePillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  civicCardSubtext: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginTop: 10,
  },
  organizedStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  statsGridCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  statsCardVal: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },
  statsCardLbl: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: 4,
  },
  healthMetricCard: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  healthMetricTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },
  healthScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthScoreBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  healthRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  healthScoreTextValue: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.primary,
  },
  healthScoreDescText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.text,
    lineHeight: 16,
    fontWeight: "600",
  },
  performanceCard: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  performanceTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 14,
  },
  indicatorRow: {
    marginBottom: 12,
  },
  indicatorMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  indicatorName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.text,
  },
  indicatorPct: {
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  leaderboardWidgetCard: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  leaderboardWidgetTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },
  leaderboardWidgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  leaderboardWidgetRowMe: {
    backgroundColor: "rgba(219, 39, 119, 0.04)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  leaderboardWidgetRank: {
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.textMuted,
    width: 20,
  },
  leaderboardWidgetName: {
    fontSize: 12.5,
    color: COLORS.text,
    fontWeight: "700",
  },
  leaderboardWidgetPts: {
    fontSize: 12.5,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "right",
  },
  leaderboardWidgetBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 1,
  },
  emptyReportsBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyReportsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  createPostCard: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  createPostHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  createPostInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 45,
    textAlignVertical: "top",
    paddingTop: 4,
  },
  attachmentPreviewContainer: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    marginTop: 12,
  },
  attachmentPreviewImage: {
    width: "100%",
    height: "100%",
  },
  removeAttachmentBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPreviewBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  createPostActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  mediaActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  mediaActionBtnActive: {
    backgroundColor: "rgba(219, 39, 119, 0.08)",
  },
  mediaActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  publishPostBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  publishPostBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "800",
  },
  mediaPostCard: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  postHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  postAuthorName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: COLORS.text,
  },
  postTimeText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  postLocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(219, 39, 119, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  postLocationBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },
  postContentText: {
    fontSize: 13.5,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  postMediaContainer: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: 12,
  },
  postMediaImage: {
    width: "100%",
    height: "100%",
  },
  postVideoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  postActionBar: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  postActionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  postActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  commentsTray: {
    marginTop: 10,
  },
  commentsDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    marginBottom: 10,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  commentAuthorName: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },
  commentTextContent: {
    fontSize: 11.5,
    color: COLORS.text,
    marginTop: 1,
  },
  writeCommentCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  commentInputBox: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    paddingVertical: 4,
  },
  sendCommentBtn: {
    backgroundColor: COLORS.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
});
