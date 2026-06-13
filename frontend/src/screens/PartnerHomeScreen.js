import React, { useState, useEffect, useContext, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  Image,
  Modal,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { COLORS, GRADIENTS } from "../theme/colors";
import {
  Wrench,
  MapPin,
  User,
  LogOut,
  CheckCircle2,
  Clock,
  PlayCircle,
  ShieldCheck,
  Bell,
  ChevronLeft,
  MoreVertical,
  Sparkles,
  Folder,
  Settings,
  BarChart2,
  Calendar,
  Camera,
  Smartphone,
  X,
  Trophy,
  CreditCard,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import LeafletMap from "../components/LeafletMap";
import * as Location from "expo-location";
import CameraView from "expo-camera/build/CameraView";
import ExpoCameraManager from "expo-camera/build/ExpoCameraManager";

import PartnerDashboardScreen from './PartnerDashboardScreen';

export default function PartnerHomeScreen() {
  const { user, token, logout, apiBaseUrl, isOfflineMode } =
    useContext(AuthContext);
  const [partnerLat, setPartnerLat] = useState(13.0827); // Default Chennai Lat
  const [partnerLng, setPartnerLng] = useState(80.2707); // Default Chennai Lng
  const [partnerZone, setPartnerZone] = useState("Chennai"); // Geocoded operational zone (overall city only)
  const [detailedLocation, setDetailedLocation] = useState(
    "Chennai, Tamil Nadu",
  ); // Geocoded complete detailed address for camera telemetry
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [leaderboard, setLeaderboard] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Operational states
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedSchedDate, setSelectedSchedDate] = useState("");
  const [selectedSchedTime, setSelectedSchedTime] = useState("10:00 AM");
  const [cameraPic, setCameraPic] = useState(null);
  const [cameraStep, setCameraStep] = useState("viewfinder"); // 'viewfinder' or 'preview'

  // Tabs: 'ongoing' (In Progress), 'todo' (Assigned), 'done' (Resolved)
  const [activeTab, setActiveTab] = useState("todo");
  const [refreshing, setRefreshing] = useState(false);
  const cameraRef = useRef(null);

  const getCameraPermissionAsync = async () => {
    try {
      if (ExpoCameraManager && ExpoCameraManager.getCameraPermissionsAsync) {
        const perm = await ExpoCameraManager.getCameraPermissionsAsync();
        if (perm.granted) return perm;
      }
      if (
        ExpoCameraManager &&
        ExpoCameraManager.requestCameraPermissionsAsync
      ) {
        return await ExpoCameraManager.requestCameraPermissionsAsync();
      }
      return { granted: true };
    } catch (e) {
      console.warn("Camera permissions fallback:", e);
      return { granted: true };
    }
  };

  // Dynamic greeting based on current local hour
  const getGreetingTime = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setPartnerLat(loc.coords.latitude);
          setPartnerLng(loc.coords.longitude);

          // Reverse geocode to retrieve complete detailed location name
          const geo = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo && geo.length > 0) {
            const g = geo[0];

            // Set the overall city name only for Operational Zone
            setPartnerZone(g.city || "Chennai");

            // Build a complete detailed address using all available segments, filtering out duplicates
            const parts = [
              g.name,
              g.streetNumber,
              g.street,
              g.subregion,
              g.district,
              g.city,
              g.region,
              g.postalCode,
              g.country,
            ]
              .map((p) => (p ? p.trim() : ""))
              .filter((val, index, self) => val && self.indexOf(val) === index);
            const fullAddress =
              parts.length > 0 ? parts.join(", ") : "Chennai, Tamil Nadu";
            setDetailedLocation(fullAddress);
          }
        }
      } catch (err) {
        console.warn("Could not determine partner GPS location:", err);
      } finally {
        fetchJobs();
      }
    })();
  }, []);

  useEffect(() => {
    if (token) {
      const interval = setInterval(() => {
        fetchJobs(true); // Silent poll in real-time
      }, 10000); // 10 seconds interval
      return () => clearInterval(interval);
    }
  }, [token, selectedJob]);

  // Re-fetch partner's live GPS and complete detailed location (called when camera opens)
  const refreshPartnerGPS = async () => {
    try {
      // First try to get fresh high accuracy position, fallback to balanced or last known if needed
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (!loc) {
        loc = await Location.getLastKnownPositionAsync().catch(() => null);
      }
      if (loc) {
        setPartnerLat(loc.coords.latitude);
        setPartnerLng(loc.coords.longitude);
        const geo = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }).catch(() => null);
        if (geo && geo.length > 0) {
          const g = geo[0];

          // Set the overall city name only for Operational Zone
          setPartnerZone(g.city || "Chennai");

          const parts = [
            g.name,
            g.streetNumber,
            g.street,
            g.subregion,
            g.district,
            g.city,
            g.region,
            g.postalCode,
            g.country,
          ]
            .map((p) => (p ? p.trim() : ""))
            .filter((val, index, self) => val && self.indexOf(val) === index);
          setDetailedLocation(
            parts.length > 0 ? parts.join(", ") : "Chennai, Tamil Nadu",
          );
        }
      }
    } catch (err) {
      console.warn("GPS refresh failed:", err);
    }
  };

  // Format timestamp relatively for notifications
  const formatRelativeTime = (isoString) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs} hours ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays} days ago`;
    } catch {
      return "Recently";
    }
  };

  // Generate dynamic partner notifications based on live job database states
  const generatePartnerNotifications = () => {
    const list = [];

    // Sort jobs to get latest updates first
    const sortedJobs = [...jobs].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    );

    sortedJobs.forEach((job) => {
      // 1. Assigned notification (To do / Assigned)
      if (job.status === "Assigned" && isMyJob(job)) {
        list.push({
          id: `assigned_${job._id}`,
          title: "New Task Assigned",
          body: `You have been assigned to resolve a ${job.category} issue: "${job.description.substring(0, 45)}..."`,
          type: "assigned",
          time: job.assignedAt || job.createdAt || new Date().toISOString(),
        });
      }

      // 2. Scheduled notification
      if (job.status === "Scheduled" && isMyJob(job)) {
        list.push({
          id: `scheduled_${job._id}`,
          title: "Operations Scheduled",
          body: `Operations scheduled for ${job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "TBD"} @ ${job.scheduledTime || "TBD"}`,
          type: "scheduled",
          time: job.updatedAt || new Date().toISOString(),
        });
      }

      // 3. In Progress notification
      if (job.status === "In Progress" && isMyJob(job)) {
        list.push({
          id: `inprogress_${job._id}`,
          title: "Operations Started",
          body: `You have started active operations for request #${job._id.substring(18)}`,
          type: "inprogress",
          time: job.updatedAt || new Date().toISOString(),
        });
      }

      // 4. Completed/Done notification
      if (
        (job.status === "Resolved" || job.status === "Done") &&
        isMyJob(job)
      ) {
        list.push({
          id: `done_${job._id}`,
          title: "Task Verified Done",
          body: `Verification photo submitted successfully for task #${job._id.substring(18)}. Status updated to Done in database.`,
          type: "done",
          time: job.resolvedAt || job.updatedAt || new Date().toISOString(),
        });
      }
    });

    // Also add a general greeting notification if the list is empty
    if (list.length === 0) {
      list.push({
        id: "welcome_partner",
        title: "Welcome to SmartFix Dashboard",
        body: "Your operational service console is fully synchronized and active. Awaiting new municipal assignments.",
        type: "info",
        time: new Date().toISOString(),
      });
    }

    return list;
  };

  const fetchJobs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/partner-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setJobs(data);

      // Update selectedJob in real-time if job card details are open
      if (selectedJob) {
        const updatedJob = data.find((j) => j._id === selectedJob._id);
        if (updatedJob) {
          setSelectedJob(updatedJob);
        }
      }
    } catch (e) {
      console.warn("API error, using Sandbox mock partner jobs:", e.message);
      // Mock data â€” partner field set to current user so isMyJob() works correctly
      const mockPartner = {
        _id: user?.id || user?._id || "mock_partner",
        id: user?.id || user?._id || "mock_partner",
        name: user?.name || "Partner",
      };
      setJobs([
        {
          _id: "mock_partner_job_1",
          category: user?.partnerCategory || "garbage",
          description:
            "Accumulated trash bin neglect on main street pathway causing foul odor.",
          latitude: 13.0827,
          longitude: 80.2707,
          status: "In Progress",
          priority: "High",
          progressPercent: 75,
          partner: mockPartner,
          user: { name: "Srinivasan", email: "srinivasan@citizen.com" },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          _id: "mock_partner_job_2",
          category: user?.partnerCategory || "garbage",
          description:
            "Debris clear and road mud accumulation after pipe replacement work.",
          latitude: 13.085,
          longitude: 80.28,
          status: "Assigned",
          priority: "Low",
          progressPercent: 30,
          partner: mockPartner,
          user: { name: "Lakshmi", email: "lakshmi@citizen.com" },
          createdAt: new Date(Date.now() - 72000000).toISOString(),
        },
        {
          _id: "mock_partner_job_3",
          category: user?.partnerCategory || "garbage",
          description:
            "Garbage dump overflow clearance near neighborhood local park gate.",
          latitude: 13.089,
          longitude: 80.272,
          status: "Pending",
          priority: "Medium",
          progressPercent: 10,
          partner: null,
          user: { name: "Karthik", email: "karthik@citizen.com" },
          createdAt: new Date(Date.now() - 144000000).toISOString(),
        },
        {
          _id: "mock_partner_job_4",
          category: user?.partnerCategory || "garbage",
          description:
            "Storm drain blockage causing waterlogging near residential zone.",
          latitude: 13.09,
          longitude: 80.275,
          status: "Resolved",
          priority: "High",
          progressPercent: 100,
          partner: mockPartner,
          user: { name: "Meena", email: "meena@citizen.com" },
          createdAt: new Date(Date.now() - 288000000).toISOString(),
          resolvedAt: new Date(Date.now() - 200000000).toISOString(),
        },
      ]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleUpdateStatus = async (jobId, newStatus) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: jobId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setSelectedJob(null);
      fetchJobs();
    } catch (e) {
      // Mock local state changes in sandbox mode
      setJobs((prev) =>
        prev.map((job) => {
          if (job._id === jobId) {
            const updatedJob = { ...job, status: newStatus };
            if (newStatus === "Resolved") {
              updatedJob.resolvedAt = new Date().toISOString();
              updatedJob.progressPercent = 100;
            } else if (newStatus === "In Progress") {
              updatedJob.progressPercent = 75;
            }
            return updatedJob;
          }
          return job;
        }),
      );
      setSelectedJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupJob = async (jobId) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/pickup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: jobId }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Another partner already grabbed this task
        Alert.alert(
          "Task Unavailable",
          "This task was just picked up by another partner. The list will refresh automatically.",
          [
            {
              text: "OK",
              onPress: () => {
                setSelectedJob(null);
                fetchJobs();
              },
            },
          ],
        );
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to pick up task");
      }

      Alert.alert(
        "Task Claimed!",
        "You have successfully picked up this civic complaint. It is now listed under your active Ongoing tasks.",
      );
      setSelectedJob(null);
      setActiveTab("ongoing");
      fetchJobs();
    } catch (e) {
      console.warn("Pickup API error:", e.message);
      // Fallback/Mock behavior for offline/development mode
      setJobs((prev) =>
        prev.map((job) => {
          if (job._id === jobId) {
            return {
              ...job,
              partner: user,
              status: "In Progress",
              assignedAt: new Date().toISOString(),
            };
          }
          return job;
        }),
      );
      setSelectedJob(null);
      setActiveTab("ongoing");
      Alert.alert(
        "Success (Local Mode)",
        "You picked up the task. A simulated email notification was sent to the user.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleJob = async (jobId, dateStr, timeStr) => {
    if (!dateStr) {
      Alert.alert(
        "Input Needed",
        "Please select a date from the calendar option.",
      );
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: jobId,
          scheduledDate: dateStr,
          scheduledTime: timeStr,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to schedule task");
      }

      Alert.alert(
        "Task Scheduled!",
        `Successfully scheduled for ${new Date(dateStr).toLocaleDateString()} at ${timeStr}.`,
      );
      setIsSchedulingOpen(false);
      setSelectedJob(null);
      fetchJobs();
    } catch (e) {
      console.warn("Schedule API error:", e.message);
      // Fallback/Mock behavior for offline/development mode
      setJobs((prev) =>
        prev.map((job) => {
          if (job._id === jobId) {
            return {
              ...job,
              status: "Scheduled",
              scheduledDate: dateStr,
              scheduledTime: timeStr,
            };
          }
          return job;
        }),
      );
      setIsSchedulingOpen(false);
      setSelectedJob(null);
      Alert.alert(
        "Scheduled (Local Mode)",
        `Task scheduled locally for ${new Date(dateStr).toLocaleDateString()} at ${timeStr}.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResolveJob = async (jobId, base64Photo) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/requests/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: jobId,
          status: "Resolved", // Set to Resolved so citizen can review
          resolutionImage: base64Photo,
          resolutionLatitude: partnerLat,
          resolutionLongitude: partnerLng,
          resolutionLocationName: detailedLocation || "Chennai, Tamil Nadu",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resolve task");
      }

      Alert.alert(
        "Task Completed!",
        "Excellent work! The verified civic complaint has been updated to Resolved in the database with your GPS photo proof. The citizen will now review and rate your work.",
      );
      setIsCameraOpen(false);
      setCameraPic(null);
      setSelectedJob(null);
      fetchJobs();
    } catch (e) {
      console.warn("Resolve API error:", e.message);
      // Fallback/Mock behavior for offline/development mode
      setJobs((prev) =>
        prev.map((job) => {
          if (job._id === jobId) {
            return {
              ...job,
              status: "Resolved",
              resolvedAt: new Date().toISOString(),
              resolutionImage: base64Photo,
              resolutionLatitude: partnerLat,
              resolutionLongitude: partnerLng,
              resolutionLocationName: detailedLocation || "Chennai, Tamil Nadu",
            };
          }
          return job;
        }),
      );
      setIsCameraOpen(false);
      setCameraPic(null);
      setSelectedJob(null);
      Alert.alert(
        "Completed (Local Mode)",
        "Task completed and verification proof recorded successfully.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getNext7Days = () => {
    const list = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push({
        date: d,
        dayNum: d.getDate(),
        dayName: weekdays[d.getDay()],
        monthName: d.toLocaleString("en-US", { month: "short" }),
        isoStr: d.toISOString().split("T")[0],
      });
    }
    return list;
  };

  // Status mapping
  // To-do   = Pending jobs with NO partner assigned (available for any partner to pick up)
  // Ongoing  = Any job THIS partner has claimed: Assigned, Scheduled, In Progress
  // Done     = Resolved / Done jobs belonging to THIS partner
  //
  // NOTE: All IDs are converted to strings because MongoDB ObjectId !== string
  // even if they represent the same value.
  const myId = String(user?.id || user?._id || "");

  const isMyJob = (j) => {
    if (!myId) return false;
    // Extract partner ID â€” could be a populated object or a raw ID string/ObjectId
    const partner = j.partner;
    if (!partner) return false;

    // Try every possible location for the ID
    const candidates = [
      partner?._id,
      partner?.id,
      partner, // if partner IS the raw ID (not populated)
    ];

    return candidates.some((c) => {
      if (!c) return false;
      const s = String(c);
      // A valid ObjectId is 24 hex chars â€” skip obviously wrong values
      if (s === "[object Object]") return false;
      return s === myId;
    });
  };

  const getFilteredJobs = () => {
    if (activeTab === "ongoing") {
      // Everything this partner has picked up that isn't done yet
      return jobs.filter(
        (j) =>
          ["Assigned", "Scheduled", "In Progress"].includes(j.status) &&
          isMyJob(j),
      );
    } else if (activeTab === "todo") {
      // Only unassigned Pending tasks â€” available for anyone to pick up
      return jobs.filter((j) => j.status === "Pending" && !j.partner);
    } else {
      // Done â€” this partner's completed tasks only
      return jobs.filter(
        (j) => (j.status === "Resolved" || j.status === "Done") && isMyJob(j),
      );
    }
  };

  const ongoingCount = jobs.filter(
    (j) =>
      ["Assigned", "Scheduled", "In Progress"].includes(j.status) && isMyJob(j),
  ).length;
  const todoCount = jobs.filter(
    (j) => j.status === "Pending" && !j.partner,
  ).length;
  const doneCount = jobs.filter(
    (j) => (j.status === "Resolved" || j.status === "Done") && isMyJob(j),
  ).length;

  const filteredJobs = getFilteredJobs();
  const doneJobs = jobs.filter((j) => ["Resolved", "Done"].includes(j.status));

  // Helper to draw the battery indicator |||||||||| 75%
  const renderBatteryMeter = (percent) => {
    const totalBars = 30;
    const activeBars = Math.round((percent / 100) * totalBars);
    let meterString = "";
    for (let i = 0; i < totalBars; i++) {
      meterString += "|";
    }

    return (
      <View style={styles.batteryContainer}>
        <Text style={styles.batteryLabel}>Progress</Text>
        <View style={styles.batteryMeterRow}>
          <View style={styles.batteryTrack}>
            <Text style={[styles.batteryBarsText, { width: `${percent}%` }]}>
              {meterString}
            </Text>
            <Text style={styles.batteryBarsBackgroundText}>{meterString}</Text>
          </View>
          <Text style={styles.batteryPercentText}>{percent}%</Text>
        </View>
      </View>
    );
  };

  if (activePage === 'dashboard') {
    return <PartnerDashboardScreen onBack={() => setActivePage('home')} />;
  }

  return (
    <View style={styles.container}>
      {/* BACKGROUND GRAPHIC */}
      <LinearGradient
        colors={["#fef4f8", "#f0f2fd", "#ffffff"]}
        style={styles.absoluteBackground}
      />

      {/* HEADER */}
      <View style={styles.navBar}>
        <View style={styles.navLeftWrapper}>
          <TouchableOpacity style={styles.hamburgerButton}>
            <Wrench stroke={COLORS.primary} size={20} strokeWidth={2.5} />
          </TouchableOpacity>

          {selectedJob ? (
            <TouchableOpacity
              style={styles.headerTitleBadge}
              onPress={() => setSelectedJob(null)}
            >
              <ChevronLeft stroke={COLORS.text} size={14} />
              <Text style={styles.headerBadgeText}>Back to List</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.greetingHeaderBox}>
              <Text style={styles.greetingTimeText}>{getGreetingTime()}</Text>
              <Text style={styles.greetingNameText}>
                {user?.name?.split(" ")[0] || "Partner"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.navRightGroup}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={async () => {
              try {
                const res = await fetch(
                  `${apiBaseUrl}/requests/admin/leaderboard`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );
                if (res.ok) {
                  const data = await res.json();
                  setLeaderboard(data);
                }
              } catch (e) {
                console.log(e);
              }
              setActivePage('dashboard');
            }}
          >
            <Trophy stroke={COLORS.text} size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setActivePage('dashboard')}
          >
            <Bell stroke={COLORS.text} size={18} />
            {generatePartnerNotifications().length > 0 && (
              <View style={styles.bellRedDot} />
            )}
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
                style={{ color: "#ffffff", fontSize: 14, fontWeight: "900" }}
              >
                {(user?.name || "P")[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchJobs();
              setRefreshing(false);
            }}
            colors={["#db2777"]}
            tintColor={"#db2777"}
          />
        }
      >
        {!selectedJob ? (
          <>
            {/* Welcome banner */}
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeTitle}>Welcome back, Provider! </Text>
              <Text style={styles.welcomeSub}>
                Operational Zone:{" "}
                <Text style={styles.zoneText}>{partnerZone}</Text> Category:{" "}
                <Text style={styles.zoneText}>
                  {(user?.partnerCategory || "garbage").toUpperCase()}
                </Text>
              </Text>
            </View>

            {/* Filter Tabs mimicking Ongoing, To do, Done */}
            <View style={styles.tabScrollWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.tabPill,
                    activeTab === "ongoing" && styles.activeTabPill,
                  ]}
                  onPress={() => setActiveTab("ongoing")}
                >
                  <View
                    style={[
                      styles.tabDot,
                      { backgroundColor: COLORS.secondary },
                    ]}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === "ongoing" && styles.activeTabLabel,
                    ]}
                  >
                    Ongoing
                  </Text>
                  <View
                    style={[
                      styles.tabCountBadge,
                      activeTab === "ongoing" && styles.activeCountBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        activeTab === "ongoing" && styles.activeCountText,
                      ]}
                    >
                      {ongoingCount}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabPill,
                    activeTab === "todo" && styles.activeTabPill,
                  ]}
                  onPress={() => setActiveTab("todo")}
                >
                  <View
                    style={[styles.tabDot, { backgroundColor: COLORS.orange }]}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === "todo" && styles.activeTabLabel,
                    ]}
                  >
                    To do
                  </Text>
                  <View
                    style={[
                      styles.tabCountBadge,
                      activeTab === "todo" && styles.activeCountBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        activeTab === "todo" && styles.activeCountText,
                      ]}
                    >
                      {todoCount}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabPill,
                    activeTab === "done" && styles.activeTabPill,
                  ]}
                  onPress={() => setActiveTab("done")}
                >
                  <View
                    style={[styles.tabDot, { backgroundColor: COLORS.success }]}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === "done" && styles.activeTabLabel,
                    ]}
                  >
                    Done
                  </Text>
                  <View
                    style={[
                      styles.tabCountBadge,
                      activeTab === "done" && styles.activeCountBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        activeTab === "done" && styles.activeCountText,
                      ]}
                    >
                      {doneCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Tasks list */}
            <View style={styles.listSection}>
              {loading && filteredJobs.length === 0 ? (
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                  style={{ marginVertical: 40 }}
                />
              ) : filteredJobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <CheckCircle2
                    stroke={COLORS.textMuted}
                    size={48}
                    style={{ marginBottom: 12 }}
                  />
                  <Text style={styles.emptyTitle}>All caught up!</Text>
                  <Text style={styles.emptyDesc}>
                    No active municipal jobs in this queue folder.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredJobs}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    // Decide custom glass card colors based on priority
                    const isHigh = item.priority === "High" || !item.priority;
                    const isLow = item.priority === "Low";
                    let priorityBg = "rgba(16, 185, 129, 0.08)";
                    let priorityText = COLORS.success;
                    let cardBorder = "rgba(16, 185, 129, 0.2)";

                    if (isLow) {
                      priorityBg = "rgba(168, 85, 247, 0.08)";
                      priorityText = COLORS.secondary;
                      cardBorder = "rgba(168, 85, 247, 0.2)";
                    } else if (item.priority === "Medium") {
                      priorityBg = "rgba(245, 158, 11, 0.08)";
                      priorityText = COLORS.orange;
                      cardBorder = "rgba(245, 158, 11, 0.2)";
                    }

                    return (
                      <TouchableOpacity
                        style={[styles.taskCard, { borderColor: cardBorder }]}
                        onPress={() => setSelectedJob(item)}
                      >
                        <View style={styles.cardHeaderRow}>
                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: priorityBg },
                            ]}
                          >
                            <View
                              style={[
                                styles.priorityDot,
                                { backgroundColor: priorityText },
                              ]}
                            />
                            <Text
                              style={[
                                styles.priorityLabelText,
                                { color: priorityText },
                              ]}
                            >
                              {item.priority || "High"}
                            </Text>
                          </View>
                          <TouchableOpacity>
                            <MoreVertical stroke={COLORS.textMuted} size={16} />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.taskCardTitle}>
                          {item.category.toUpperCase()} CLEARANCE
                        </Text>
                        <Text style={styles.taskCardDesc} numberOfLines={2}>
                          {item.description}
                        </Text>

                        {/* Progress bar â€” reflects status */}
                        {renderBatteryMeter(
                          item.progressPercent ||
                            (item.status === "Resolved" ||
                            item.status === "Done"
                              ? 100
                              : item.status === "In Progress"
                                ? 75
                                : item.status === "Scheduled"
                                  ? 50
                                  : item.status === "Assigned"
                                    ? 30
                                    : 10),
                        )}

                        <View style={styles.cardFooterRow}>
                          <View style={styles.clientBadge}>
                            <User
                              stroke={COLORS.textMuted}
                              size={11}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.clientBadgeText}>
                              {item.user?.name || "Citizen"}
                            </Text>
                          </View>
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
          </>
        ) : (
          /* Detailed resolution panel */
          <View style={styles.jobDetailsPanel}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitleText}>
                Job Coordination Operations
              </Text>
              <Text style={styles.detailsSubtitleText}>
                Complaint Code: SF-{selectedJob._id.substring(16)}
              </Text>
            </View>

            <Text style={styles.detailsDesc}>{selectedJob.description}</Text>

            {selectedJob.citizenImage && (
              <View
                style={{
                  marginBottom: 15,
                  borderRadius: 10,
                  overflow: "hidden",
                  height: 180,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Image
                  source={{ uri: selectedJob.citizenImage }}
                  style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                />
              </View>
            )}

            <View style={styles.clientDetailBox}>
              <View style={styles.clientDetailCol}>
                <Text style={styles.clientMetaLabel}>Reported By</Text>
                <Text style={styles.clientMetaVal}>
                  {selectedJob.user?.name || "Local citizen"}
                </Text>
              </View>
              <View style={styles.clientDetailCol}>
                <Text style={styles.clientMetaLabel}>Contact Email</Text>
                <Text style={styles.clientMetaVal}>
                  {selectedJob.user?.email || "N/A"}
                </Text>
              </View>
            </View>

            {/* GEOGRAPHIC MAP â€” Read-only, no Confirm button, enlarged */}
            <View style={{ marginBottom: 18 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <MapPin stroke={COLORS.primary} size={14} />
                <Text style={[styles.mapTitleText, { marginLeft: 6 }]}>
                  Complaint Location
                </Text>
              </View>
              <LeafletMap
                latitude={selectedJob.latitude || partnerLat}
                longitude={selectedJob.longitude || partnerLng}
                readOnly={true}
              />
            </View>

            {/* ACTION TRIGGERS */}
            <View style={styles.actionSection}>
              {/* Pick up â€” only for Pending unassigned tasks */}
              {selectedJob.status === "Pending" && !selectedJob.partner && (
                <TouchableOpacity
                  style={[
                    styles.btnStartJob,
                    { backgroundColor: COLORS.primary },
                  ]}
                  onPress={() => handlePickupJob(selectedJob._id)}
                >
                  <CheckCircle2
                    stroke="#ffffff"
                    size={18}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.btnActionText}>Pick up Task</Text>
                </TouchableOpacity>
              )}

              {/* Assigned â€” show Start + Schedule options */}
              {selectedJob.status === "Assigned" && isMyJob(selectedJob) && (
                <View style={{ gap: 10, width: "100%", marginBottom: 10 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(99, 102, 241, 0.07)",
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(99, 102, 241, 0.12)",
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <CheckCircle2
                      stroke={COLORS.primary}
                      size={14}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.primary,
                        fontWeight: "700",
                      }}
                    >
                      You picked up this job. Start or schedule it below.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.btnStartJob}
                    onPress={() =>
                      handleUpdateStatus(selectedJob._id, "In Progress")
                    }
                  >
                    <PlayCircle
                      stroke="#ffffff"
                      size={18}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.btnActionText}>
                      Start Operations Now
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btnStartJob,
                      {
                        backgroundColor: "rgba(99, 102, 241, 0.1)",
                        borderWidth: 1.5,
                        borderColor: COLORS.primary,
                      },
                    ]}
                    onPress={() => {
                      setSelectedSchedDate(getNext7Days()[0].isoStr);
                      setIsSchedulingOpen(true);
                    }}
                  >
                    <Calendar
                      stroke={COLORS.primary}
                      size={18}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[styles.btnActionText, { color: COLORS.primary }]}
                    >
                      Schedule for Later
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnResolveJob}
                    onPress={async () => {
                      try {
                        setCameraStep("viewfinder");
                        setCameraPic(null);
                        const perm = await getCameraPermissionAsync();
                        if (!perm || !perm.granted) {
                          Alert.alert(
                            "Permission Required",
                            "Camera permission is needed to capture proof of completion.",
                          );
                          return;
                        }
                        setIsCameraOpen(true);
                        refreshPartnerGPS();
                      } catch (err) {
                        console.warn("Camera trigger error:", err);
                        setIsCameraOpen(true);
                        refreshPartnerGPS();
                      }
                    }}
                  >
                    <CheckCircle2
                      stroke="#ffffff"
                      size={18}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.btnActionText}>Mark as Completed</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Scheduled â€” show scheduled time + options */}
              {selectedJob.status === "Scheduled" && isMyJob(selectedJob) && (
                <View style={{ gap: 10, width: "100%", marginBottom: 10 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(99, 102, 241, 0.08)",
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(99, 102, 241, 0.15)",
                      alignItems: "center",
                      marginBottom: 5,
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                  >
                    <Clock
                      stroke={COLORS.primary}
                      size={16}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        color: COLORS.text,
                        fontWeight: "700",
                      }}
                    >
                      Scheduled:{" "}
                      {selectedJob.scheduledDate
                        ? new Date(
                            selectedJob.scheduledDate,
                          ).toLocaleDateString()
                        : "TBD"}{" "}
                      @ {selectedJob.scheduledTime || "TBD"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.btnStartJob}
                    onPress={() =>
                      handleUpdateStatus(selectedJob._id, "In Progress")
                    }
                  >
                    <PlayCircle
                      stroke="#ffffff"
                      size={18}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.btnActionText}>
                      Start Operations Now
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnResolveJob}
                    onPress={async () => {
                      try {
                        setCameraStep("viewfinder");
                        setCameraPic(null);
                        const perm = await getCameraPermissionAsync();
                        if (!perm || !perm.granted) {
                          Alert.alert(
                            "Permission Required",
                            "Camera permission is needed to capture proof of completion.",
                          );
                          return;
                        }
                        setIsCameraOpen(true);
                        refreshPartnerGPS();
                      } catch (err) {
                        console.warn("Camera trigger error:", err);
                        setIsCameraOpen(true);
                        refreshPartnerGPS();
                      }
                    }}
                  >
                    <CheckCircle2
                      stroke="#ffffff"
                      size={18}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.btnActionText}>Mark as Completed</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* In Progress â€” only Mark as Completed */}
              {selectedJob.status === "In Progress" && isMyJob(selectedJob) && (
                <TouchableOpacity
                  style={styles.btnResolveJob}
                  onPress={async () => {
                    try {
                      setCameraStep("viewfinder");
                      setCameraPic(null);
                      const perm = await getCameraPermissionAsync();
                      if (!perm || !perm.granted) {
                        Alert.alert(
                          "Permission Required",
                          "Camera permission is needed to capture proof of completion.",
                        );
                        return;
                      }
                      setIsCameraOpen(true);
                      refreshPartnerGPS();
                    } catch (err) {
                      console.warn("Camera trigger error:", err);
                      setIsCameraOpen(true);
                      refreshPartnerGPS();
                    }
                  }}
                >
                  <CheckCircle2
                    stroke="#ffffff"
                    size={18}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.btnActionText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}

              {(selectedJob.status === "Resolved" ||
                selectedJob.status === "Done") && (
                <View style={styles.resolvedNotificationCard}>
                  <ShieldCheck
                    stroke={COLORS.success}
                    size={18}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.resolvedNotificationText}>
                    Completed on{" "}
                    {new Date(
                      selectedJob.resolvedAt || Date.now(),
                    ).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.btnDetailsBack}
                onPress={() => setSelectedJob(null)}
              >
                <Text style={styles.btnDetailsBackText}>
                  Back to Tasks board
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* OPERATION SCHEDULING MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSchedulingOpen}
        onRequestClose={() => setIsSchedulingOpen(false)}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.modalDragIndicator} />

            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>Schedule Operations</Text>
              <TouchableOpacity
                style={styles.profileCloseBtn}
                onPress={() => setIsSchedulingOpen(false)}
              >
                <Text style={{ fontSize: 20, color: COLORS.textMuted }}>
                  Ã—
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileModalBody}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLORS.textMuted,
                  marginBottom: 12,
                }}
              >
                SELECT DATE FROM CALENDAR
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexDirection: "row", marginBottom: 20 }}
              >
                {getNext7Days().map((day) => {
                  const isSelected = selectedSchedDate === day.isoStr;
                  return (
                    <TouchableOpacity
                      key={day.isoStr}
                      onPress={() => setSelectedSchedDate(day.isoStr)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: isSelected
                          ? COLORS.primary
                          : "rgba(255, 255, 255, 0.8)",
                        borderWidth: 1.5,
                        borderColor: isSelected
                          ? COLORS.primary
                          : "rgba(0, 0, 0, 0.05)",
                        marginRight: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 70,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isSelected ? 0.15 : 0.02,
                        shadowRadius: 4,
                        elevation: isSelected ? 2 : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: isSelected ? "#ffffff" : COLORS.textMuted,
                          textTransform: "uppercase",
                        }}
                      >
                        {day.dayName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "800",
                          color: isSelected ? "#ffffff" : COLORS.text,
                          marginVertical: 2,
                        }}
                      >
                        {day.dayNum}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: isSelected ? "#ffffff" : COLORS.textMuted,
                        }}
                      >
                        {day.monthName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLORS.textMuted,
                  marginBottom: 12,
                }}
              >
                SELECT DAILY TIME SLOT
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 30,
                }}
              >
                {[
                  "09:00 AM",
                  "10:30 AM",
                  "12:00 PM",
                  "02:00 PM",
                  "03:30 PM",
                  "05:00 PM",
                ].map((slot) => {
                  const isSelected = selectedSchedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => setSelectedSchedTime(slot)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected
                          ? COLORS.primary
                          : "rgba(255, 255, 255, 0.8)",
                        borderWidth: 1.5,
                        borderColor: isSelected
                          ? COLORS.primary
                          : "rgba(0, 0, 0, 0.05)",
                        minWidth: "30%",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isSelected ? "#ffffff" : COLORS.text,
                        }}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.profileModalLogoutBtn,
                  {
                    backgroundColor: COLORS.success,
                    shadowColor: COLORS.success,
                  },
                ]}
                onPress={() =>
                  handleScheduleJob(
                    selectedJob._id,
                    selectedSchedDate,
                    selectedSchedTime,
                  )
                }
              >
                <Text style={styles.profileModalLogoutBtnText}>
                  Confirm Task Schedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL-SCREEN EXPO-CAMERA PROOF-OF-WORK MODAL */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={isCameraOpen}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setIsCameraOpen(false);
          setCameraPic(null);
          setCameraStep("viewfinder");
        }}
      >
        <View style={{ flex: 1, backgroundColor: "#000000" }}>
          {/* VIEWFINDER â€” live camera feed */}
          {cameraStep === "viewfinder" && (
            <View style={{ flex: 1 }}>
              {/* Expo CameraView */}
              <CameraView
                ref={cameraRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                facing="back"
              />

              {/* Slight scrim for contrast */}
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.1)",
                }}
              />

              {/* TOP BAR */}
              <View
                style={{
                  position: "absolute",
                  top: Platform.OS === "ios" ? 54 : 32,
                  left: 0,
                  right: 0,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setIsCameraOpen(false);
                    setCameraPic(null);
                    setCameraStep("viewfinder");
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 22,
                      lineHeight: 24,
                      fontWeight: "300",
                    }}
                  >
                    x
                  </Text>
                </TouchableOpacity>
                <View
                  style={{
                    backgroundColor: "rgba(239,68,68,0.85)",
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: "#ffffff",
                    }}
                  />
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: "800",
                      letterSpacing: 1,
                    }}
                  >
                    LIVE
                  </Text>
                </View>
                <View style={{ width: 38 }} />
              </View>

              {/* GPS TELEMETRY â€” top left */}
              <View
                style={{
                  position: "absolute",
                  top: Platform.OS === "ios" ? 110 : 88,
                  left: 14,
                  backgroundColor: "rgba(8,12,30,0.82)",
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(16,185,129,0.35)",
                }}
              >
                <Text
                  style={{
                    color: "#10b981",
                    fontSize: 8,
                    fontWeight: "900",
                    letterSpacing: 1.2,
                    marginBottom: 4,
                  }}
                >
                  GPS TELEMETRY
                </Text>
                <Text
                  style={{
                    color: "#e2e8f0",
                    fontSize: 9.5,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    marginBottom: 1,
                  }}
                >
                  LAT {partnerLat.toFixed(6)}
                </Text>
                <Text
                  style={{
                    color: "#e2e8f0",
                    fontSize: 9.5,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    marginBottom: 4,
                  }}
                >
                  LNG {partnerLng.toFixed(6)}
                </Text>
                <Text
                  style={{ color: "#94a3b8", fontSize: 8.5, marginBottom: 1 }}
                >
                  {detailedLocation}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 8.5 }}>
                  {new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  {new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </Text>
              </View>

              {/* JOB INFO â€” top right */}
              <View
                style={{
                  position: "absolute",
                  top: Platform.OS === "ios" ? 110 : 88,
                  right: 14,
                  backgroundColor: "rgba(8,12,30,0.82)",
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(99,102,241,0.35)",
                  alignItems: "flex-end",
                }}
              >
                <Text
                  style={{
                    color: "#a5b4fc",
                    fontSize: 8,
                    fontWeight: "900",
                    letterSpacing: 1,
                    marginBottom: 3,
                  }}
                >
                  JOB INFO
                </Text>
                <Text
                  style={{ color: "#e2e8f0", fontSize: 9, fontWeight: "700" }}
                >
                  {(selectedJob?.category || "civic").toUpperCase()}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 8, marginTop: 2 }}>
                  #{selectedJob?._id?.substring(16) || "---"}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 8, marginTop: 2 }}>
                  {user?.name || "Partner"}
                </Text>
              </View>

              {/* CROSSHAIR FRAME */}
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View style={{ width: 220, height: 220, position: "relative" }}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        {
                          position: "absolute",
                          width: 30,
                          height: 30,
                          borderColor: "rgba(255,255,255,0.8)",
                          borderWidth: 2.5,
                        },
                        i === 0 && {
                          borderRightWidth: 0,
                          borderBottomWidth: 0,
                          top: 0,
                          left: 0,
                        },
                        i === 1 && {
                          borderLeftWidth: 0,
                          borderBottomWidth: 0,
                          top: 0,
                          right: 0,
                        },
                        i === 2 && {
                          borderRightWidth: 0,
                          borderTopWidth: 0,
                          bottom: 0,
                          left: 0,
                        },
                        i === 3 && {
                          borderLeftWidth: 0,
                          borderTopWidth: 0,
                          bottom: 0,
                          right: 0,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* BOTTOM â€” shutter */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingBottom: Platform.OS === "ios" ? 44 : 28,
                  paddingTop: 18,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 8,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    letterSpacing: 0.8,
                  }}
                >
                  SMARTFIX PROOF-OF-WORK // MUNICIPAL VERIFICATION
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    if (cameraRef.current) {
                      try {
                        const photo = await cameraRef.current.takePictureAsync({
                          base64: true,
                          quality: 0.7,
                        });
                        setCameraPic(photo.uri);
                        setCameraStep("preview");
                      } catch (err) {
                        console.warn("Camera capture error:", err);
                        Alert.alert(
                          "Capture Failed",
                          "Could not take photo. Please try again.",
                        );
                      }
                    }
                  }}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    borderWidth: 4,
                    borderColor: "#ffffff",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#ffffff",
                    }}
                  />
                </TouchableOpacity>
                <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
                  Tap to capture proof of completion
                </Text>
              </View>
            </View>
          )}

          {/* PREVIEW â€” after capture */}
          {cameraStep === "preview" && cameraPic && (
            <View style={{ flex: 1 }}>
              <Image
                source={{ uri: cameraPic }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                resizeMode="cover"
              />

              {/* Telemetry watermark strip */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "rgba(8,12,30,0.92)",
                  paddingTop: 14,
                  paddingBottom: Platform.OS === "ios" ? 44 : 24,
                  paddingHorizontal: 18,
                  borderTopWidth: 2,
                  borderColor: "#10b981",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#10b981",
                      fontSize: 9,
                      fontWeight: "900",
                      letterSpacing: 1.2,
                    }}
                  >
                    SMARTFIX VERIFIED PROOF
                  </Text>
                  <Text
                    style={{
                      color: "#64748b",
                      fontSize: 8,
                      fontFamily:
                        Platform.OS === "ios" ? "Courier" : "monospace",
                    }}
                  >
                    {new Date().toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", gap: 20, marginBottom: 7 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 7.5,
                        marginBottom: 2,
                      }}
                    >
                      LATITUDE
                    </Text>
                    <Text
                      style={{
                        color: "#e2e8f0",
                        fontSize: 10,
                        fontWeight: "700",
                        fontFamily:
                          Platform.OS === "ios" ? "Courier" : "monospace",
                      }}
                    >
                      {partnerLat.toFixed(6)} N
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 7.5,
                        marginBottom: 2,
                      }}
                    >
                      LONGITUDE
                    </Text>
                    <Text
                      style={{
                        color: "#e2e8f0",
                        fontSize: 10,
                        fontWeight: "700",
                        fontFamily:
                          Platform.OS === "ios" ? "Courier" : "monospace",
                      }}
                    >
                      {partnerLng.toFixed(6)} E
                    </Text>
                  </View>
                </View>
                <View
                  style={{ flexDirection: "row", gap: 20, marginBottom: 7 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 7.5,
                        marginBottom: 2,
                      }}
                    >
                      LOCATION
                    </Text>
                    <Text
                      style={{
                        color: "#e2e8f0",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {detailedLocation}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 7.5,
                        marginBottom: 2,
                      }}
                    >
                      TIME
                    </Text>
                    <Text
                      style={{
                        color: "#e2e8f0",
                        fontSize: 10,
                        fontWeight: "700",
                        fontFamily:
                          Platform.OS === "ios" ? "Courier" : "monospace",
                      }}
                    >
                      {new Date().toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
                <View
                  style={{ flexDirection: "row", gap: 20, marginBottom: 14 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 7.5,
                        marginBottom: 2,
                      }}
                    >
                      PARTNER
                    </Text>
                    <Text
                      style={{
                        color: "#e2e8f0",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {user?.name || "Partner"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 7.5,
                        marginBottom: 2,
                      }}
                    >
                      CATEGORY
                    </Text>
                    <Text
                      style={{
                        color: "#e2e8f0",
                        fontSize: 10,
                        fontWeight: "700",
                      }}
                    >
                      {(selectedJob?.category || "civic").toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Cross (retake) / Tick (upload) */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setCameraPic(null);
                      setCameraStep("viewfinder");
                    }}
                    style={{
                      flex: 1,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: "rgba(239,68,68,0.15)",
                      borderWidth: 1.5,
                      borderColor: "rgba(239,68,68,0.4)",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#ef4444",
                        fontSize: 18,
                        fontWeight: "300",
                        lineHeight: 20,
                      }}
                    >
                      x
                    </Text>
                    <Text
                      style={{
                        color: "#ef4444",
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      Retake
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleResolveJob(selectedJob._id, cameraPic)}
                    style={{
                      flex: 2,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: "#10b981",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 8,
                    }}
                    activeOpacity={0.85}
                  >
                    <CheckCircle2 stroke="#ffffff" size={18} />
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 14,
                        fontWeight: "800",
                      }}
                    >
                      Upload and Complete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* CAPTURED badge */}
              <View
                style={{
                  position: "absolute",
                  top: Platform.OS === "ios" ? 54 : 32,
                  alignSelf: "center",
                  backgroundColor: "rgba(16,185,129,0.9)",
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 stroke="#ffffff" size={12} />
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 0.8,
                  }}
                >
                  CAPTURED
                </Text>
              </View>
            </View>
          )}
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
              <Text style={styles.profileModalTitle}>
                Partner Operations Profile
              </Text>
              <TouchableOpacity
                style={styles.profileCloseBtn}
                onPress={() => setIsProfileOpen(false)}
              >
                <X size={20} color={COLORS.text} />
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
                      fontSize: 32,
                      fontWeight: "900",
                    }}
                  >
                    {(user?.name || "P")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileModalGlowRing} />
              </View>

              <Text style={styles.profileModalName}>
                {user?.name || "Partner Operator"}
              </Text>
              <Text style={styles.profileModalEmail}>
                {user?.email || "partner@smartfix.com"}
              </Text>

              <View style={styles.profileBadgePill}>
                <Text style={styles.profileBadgePillText}>
                  {" "}
                  VERIFIED SERVICE PARTNER
                </Text>
              </View>

              <View style={styles.profileDetailsCard}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Specialty Domain</Text>
                  <Text style={styles.detailItemValue}>
                    {(user?.partnerCategory || "garbage").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailItemDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Active Zone</Text>
                  <Text style={styles.detailItemValue}>{partnerZone}</Text>
                </View>
                <View style={styles.detailItemDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Tasks Completed</Text>
                  <Text style={styles.detailItemValue}>
                    {
                      jobs.filter(
                        (j) =>
                          (j.status === "Resolved" || j.status === "Done") &&
                          isMyJob(j),
                      ).length
                    }{" "}
                    Jobs
                  </Text>
                </View>
                <View style={styles.detailItemDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailItemLabel}>Wallet Balance</Text>
                  <Text style={styles.detailItemValue}>
                    {user?.civicPoints || 0} PTS (₹
                    {(user?.civicPoints || 0) / 2})
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

      {/* 7. PREMIUM NOTIFICATIONS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isNotificationsOpen}
        onRequestClose={() => setIsNotificationsOpen(false)}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.modalDragIndicator} />

            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>
                Operational Notifications
              </Text>
              <TouchableOpacity
                style={styles.profileCloseBtn}
                onPress={() => setIsNotificationsOpen(false)}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {generatePartnerNotifications().length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 60,
                  }}
                >
                  <Bell
                    stroke={COLORS.textMuted}
                    size={48}
                    style={{ marginBottom: 15, opacity: 0.5 }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: COLORS.textMuted,
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    No active notifications yet.
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.textMuted,
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    New task updates will appear here automatically.
                  </Text>
                </View>
              ) : (
                generatePartnerNotifications().map((notif) => {
                  let typeBg = "rgba(148,163,184,0.08)";
                  let typeBorder = "rgba(148,163,184,0.18)";
                  let iconColor = COLORS.textMuted;

                  if (notif.type === "assigned") {
                    typeBg = "rgba(99,102,241,0.08)";
                    typeBorder = "rgba(99,102,241,0.2)";
                    iconColor = COLORS.primary;
                  } else if (notif.type === "scheduled") {
                    typeBg = "rgba(249,115,22,0.08)";
                    typeBorder = "rgba(249,115,22,0.2)";
                    iconColor = "#f97316";
                  } else if (notif.type === "inprogress") {
                    typeBg = "rgba(59,130,246,0.08)";
                    typeBorder = "rgba(59,130,246,0.2)";
                    iconColor = "#3b82f6";
                  } else if (notif.type === "done") {
                    typeBg = "rgba(16,185,129,0.08)";
                    typeBorder = "rgba(16,185,129,0.2)";
                    iconColor = COLORS.success;
                  }

                  return (
                    <View
                      key={notif.id}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: typeBg,
                        borderWidth: 1.5,
                        borderColor: typeBorder,
                        marginBottom: 12,
                        flexDirection: "row",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: "#ffffff",
                          justifyContent: "center",
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: typeBorder,
                        }}
                      >
                        <Bell stroke={iconColor} size={15} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 3,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "800",
                              color: COLORS.text,
                            }}
                          >
                            {notif.title}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color: COLORS.textMuted,
                              fontWeight: "700",
                            }}
                          >
                            {formatRelativeTime(notif.time)}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.textMuted,
                            lineHeight: 15,
                          }}
                        >
                          {notif.body}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* 8. PREMIUM DASHBOARD MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDashboardOpen}
        onRequestClose={() => setIsDashboardOpen(false)}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.modalDragIndicator} />

            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>Partner Dashboard</Text>
              <TouchableOpacity
                style={styles.profileCloseBtn}
                onPress={() => setIsDashboardOpen(false)}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 20,
                  elevation: 2,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: COLORS.textMuted,
                    marginBottom: 5,
                  }}
                >
                  Your Civic Points
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    color: COLORS.primary,
                  }}
                >
                  {user?.civicPoints || 0} PTS
                </Text>
                <Text
                  style={{ fontSize: 14, color: COLORS.success, marginTop: 5 }}
                >
                  = ₹{((user?.civicPoints || 0) / 2).toFixed(2)}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 20,
                    borderColor: "#e2e8f0",
                    borderWidth: 1,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 12,
                      fontSize: 16,
                      backgroundColor: "#f8fafc",
                    }}
                    placeholder="Points to withdraw"
                    keyboardType="numeric"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                  />
                  <TouchableOpacity
                    style={{
                      backgroundColor: COLORS.success,
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      justifyContent: "center",
                    }}
                    onPress={async () => {
                      const amount = parseInt(withdrawAmount);
                      if (!amount || amount <= 0) {
                        Alert.alert(
                          "Invalid Amount",
                          "Please enter a valid amount of points.",
                        );
                        return;
                      }
                      try {
                        const res = await fetch(
                          `${apiBaseUrl}/requests/partner/withdraw`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ pointsToWithdraw: amount }),
                          },
                        );
                        const data = await res.json();
                        if (res.ok) {
                          Alert.alert(
                            "Success",
                            `Withdrew ${amount} PTS. ₹${data.amountCredited} will be credited to your UPI.`,
                          );
                          setWithdrawAmount("");
                          // Quick local update
                          if (user) {
                            user.civicPoints = data.civicPoints;
                          }
                        } else {
                          Alert.alert(
                            "Error",
                            data.error || "Withdrawal failed.",
                          );
                        }
                      } catch (e) {
                        Alert.alert(
                          "Error",
                          "Network error during withdrawal.",
                        );
                      }
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      Withdraw
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 15,
                  color: COLORS.text,
                }}
              >
                Top Partners Leaderboard
              </Text>

              {leaderboard.map((pt, index) => (
                <View
                  key={pt._id || index}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f1f5f9",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: index < 3 ? COLORS.primary : COLORS.textMuted,
                      width: 30,
                    }}
                  >
                    #{index + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: COLORS.text,
                      }}
                    >
                      {pt.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                      {pt.partnerCategory}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: COLORS.orange,
                    }}
                  >
                    {pt.civicPoints} PTS
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  brandTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandTitleText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 16.5,
    letterSpacing: -0.2,
  },
  headerTitleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  headerBadgeText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 12.5,
  },
  navRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  logoutButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  mainScroll: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  welcomeBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    padding: 16,
    marginBottom: 20,
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  welcomeTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  welcomeSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  zoneText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  tabScrollWrapper: {
    marginBottom: 22,
  },
  tabsContainer: {
    gap: 10,
    paddingRight: 20,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  activeTabPill: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(219,39,119,0.12)",
    shadowColor: "rgba(219,39,119,0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabLabel: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
  },
  activeTabLabel: {
    color: COLORS.text,
    fontWeight: "800",
  },
  tabCountBadge: {
    backgroundColor: "rgba(30, 27, 75, 0.04)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCountBadge: {
    backgroundColor: COLORS.primaryGlow,
  },
  tabCountText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  activeCountText: {
    color: COLORS.primary,
  },
  listSection: {
    gap: 14,
  },
  taskCard: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: "rgba(0,0,0,0.01)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityLabelText: {
    fontSize: 11,
    fontWeight: "800",
  },
  taskCardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  taskCardDesc: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    marginBottom: 16,
  },
  batteryContainer: {
    marginBottom: 16,
  },
  batteryLabel: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  batteryMeterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  batteryTrack: {
    flex: 1,
    height: 14,
    backgroundColor: "rgba(30, 27, 75, 0.03)",
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  batteryBarsText: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "rgba(219,39,119,0.12)",
    overflow: "hidden",
    letterSpacing: 0.2,
  },
  batteryBarsBackgroundText: {
    color: "rgba(30,27,75,0.06)",
    fontSize: 10,
    letterSpacing: 0.2,
  },
  batteryPercentText: {
    color: COLORS.text,
    fontSize: 11.5,
    fontWeight: "800",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.03)",
    paddingTop: 12,
  },
  clientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clientBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  cardDateText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: "600",
  },
  jobDetailsPanel: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    padding: 20,
    gap: 16,
  },
  detailsHeader: {
    borderBottomWidth: 1,
    borderColor: "rgba(30, 27, 75, 0.04)",
    paddingBottom: 12,
  },
  detailsTitleText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  detailsSubtitleText: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  detailsDesc: {
    color: COLORS.text,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "600",
  },
  clientDetailBox: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
    borderRadius: 14,
    padding: 14,
    gap: 16,
  },
  clientDetailCol: {
    flex: 1,
  },
  clientMetaLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  clientMetaVal: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: "800",
    marginTop: 2,
  },
  detailsMapContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(30, 27, 75, 0.05)",
    padding: 10,
    overflow: "hidden",
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  mapTitleText: {
    color: COLORS.text,
    fontSize: 11.5,
    fontWeight: "800",
  },
  actionSection: {
    gap: 10,
    marginTop: 4,
  },
  btnStartJob: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  btnResolveJob: {
    flexDirection: "row",
    backgroundColor: COLORS.success,
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  btnActionText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "800",
  },
  resolvedNotificationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderRadius: 14,
    padding: 14,
  },
  resolvedNotificationText: {
    color: COLORS.success,
    fontSize: 12.5,
    fontWeight: "700",
  },
  btnDetailsBack: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "rgba(30, 27, 75, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  btnDetailsBackText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 4,
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
});
