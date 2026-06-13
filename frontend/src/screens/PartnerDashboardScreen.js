import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Platform,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { COLORS } from "../theme/colors";
import {
  ArrowLeft,
  Trophy,
  CreditCard,
  Bell,
  CheckCircle2,
  AlertCircle,
} from "lucide-react-native";

export default function PartnerDashboardScreen({ onBack }) {
  const { user, token, apiBaseUrl } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("withdraw"); // 'withdraw', 'leaderboard', 'notifications'

  const [leaderboard, setLeaderboard] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === "leaderboard") {
      try {
        const res = await fetch(`${apiBaseUrl}/requests/admin/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
        }
      } catch (e) {
        console.log(e);
      }
    } else if (activeTab === "notifications") {
      // Assuming notifications are generated locally for now as in PartnerHomeScreen
      const localNotifs = [];
      setNotifications(localNotifs);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount of points.");
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/requests/partner/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pointsToWithdraw: amount }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          "Success",
          `Withdrew ${amount} PTS. ₹${data.amountCredited} will be credited to your UPI.`,
        );
        setWithdrawAmount("");
        if (user) {
          user.civicPoints = data.civicPoints;
        }
      } else {
        Alert.alert("Error", data.error || "Withdrawal failed.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error during withdrawal.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft stroke={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "withdraw" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("withdraw")}
        >
          <CreditCard
            stroke={
              activeTab === "withdraw" ? COLORS.primary : COLORS.textMuted
            }
            size={16}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "withdraw" && styles.activeTabText,
            ]}
          >
            Withdraw
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "leaderboard" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("leaderboard")}
        >
          <Trophy
            stroke={
              activeTab === "leaderboard" ? COLORS.primary : COLORS.textMuted
            }
            size={16}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "leaderboard" && styles.activeTabText,
            ]}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "notifications" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("notifications")}
        >
          <Bell
            stroke={
              activeTab === "notifications" ? COLORS.primary : COLORS.textMuted
            }
            size={16}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "notifications" && styles.activeTabText,
            ]}
          >
            Alerts
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === "withdraw" && (
          <ScrollView>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Civic Points Wallet</Text>
              <Text style={styles.pointsText}>
                {user?.civicPoints || 0} PTS
              </Text>
              <Text style={styles.moneyText}>
                Equivalent: ₹{((user?.civicPoints || 0) / 2).toFixed(2)}
              </Text>

              <View style={styles.infoBox}>
                <AlertCircle
                  stroke={COLORS.info}
                  size={16}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.infoText}>
                  Your Civic Points are calculated based on the successful
                  completion of issues and the star rating feedback provided by
                  citizens. Keep delivering excellent service to earn more
                  points!
                </Text>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Points to withdraw"
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
                <TouchableOpacity
                  style={styles.withdrawBtn}
                  onPress={handleWithdraw}
                >
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === "leaderboard" && (
          <FlatList
            data={leaderboard}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.leaderboardItem}>
                <Text
                  style={[
                    styles.rankText,
                    index < 3 && { color: COLORS.primary },
                  ]}
                >
                  #{index + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbName}>{item.name}</Text>
                  <Text style={styles.lbCategory}>{item.partnerCategory}</Text>
                </View>
                <Text style={styles.lbPoints}>{item.civicPoints} PTS</Text>
              </View>
            )}
          />
        )}

        {activeTab === "notifications" && (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.notificationItem}>
                {item.type === "success" ? (
                  <CheckCircle2
                    stroke={COLORS.success}
                    size={24}
                    style={{ marginRight: 12 }}
                  />
                ) : (
                  <AlertCircle
                    stroke={COLORS.orange}
                    size={24}
                    style={{ marginRight: 12 }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifDesc}>{item.desc}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: 6,
  },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
  activeTabText: { color: COLORS.primary },
  content: { flex: 1, padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardTitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 5 },
  pointsText: { fontSize: 36, fontWeight: "bold", color: COLORS.primary },
  moneyText: {
    fontSize: 16,
    color: COLORS.success,
    marginTop: 5,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, color: "#1e3a8a", lineHeight: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  input: { flex: 1, padding: 15, fontSize: 16, backgroundColor: "#f8fafc" },
  withdrawBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 25,
    paddingVertical: 15,
    justifyContent: "center",
  },
  withdrawBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  rankText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textMuted,
    width: 40,
  },
  lbName: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
  lbCategory: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "capitalize",
  },
  lbPoints: { fontSize: 16, fontWeight: "bold", color: COLORS.orange },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
    alignItems: "flex-start",
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  notifDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 8,
  },
  notifTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
});
