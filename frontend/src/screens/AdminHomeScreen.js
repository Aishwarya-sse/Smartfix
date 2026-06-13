import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  FlatList,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { COLORS, GRADIENTS } from '../theme/colors';
import {
  MapPin,
  User,
  Clock,
  Shield,
  RefreshCw,
  Award,
  Star,
  Plus,
  Search,
  Building,
  Phone,
  X,
  Eye,
  Settings,
  Mail,
  Calendar,
  AlertCircle,
  FileText,
  Trash2,
  Lock,
  ChevronRight,
  TrendingUp,
  UserCheck,
  CheckCircle,
  Sliders,
  LogOut,
  Map,
  Compass,
  AlertTriangle,
  UserPlus,
  Check
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LeafletMap from '../components/LeafletMap';

export default function AdminHomeScreen() {
  const { token, apiBaseUrl, logout, user } = useContext(AuthContext);

  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const [windowHeight, setWindowHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(Dimensions.get('window').width);
      setWindowHeight(Dimensions.get('window').height);
    };
    const subscription = Dimensions.addEventListener('change', handleResize);
    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  const isMobile = windowWidth < 990;
  
  // Data States
  const [requests, setRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'partners'
  
  // Filtering & Searching
  const [ticketFilter, setTicketFilter] = useState('All'); // 'All' | 'Pending' | 'Assigned' | 'Scheduled' | 'In Progress' | 'Resolved'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / Interaction States
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  const [reassignTicket, setReassignTicket] = useState(null);
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  
  const [addJobModalVisible, setAddJobModalVisible] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    category: 'garbage',
    description: '',
    latitude: '13.0827',
    longitude: '80.2707'
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Fetch Admin Data
  const fetchAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // 1. Fetch all requests
      const requestsRes = await fetch(`${apiBaseUrl}/requests/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const requestsData = await requestsRes.json();
      if (!requestsRes.ok) throw new Error(requestsData.error || 'Failed to fetch tickets');
      setRequests(requestsData);

      // 2. Fetch all partners
      const partnersRes = await fetch(`${apiBaseUrl}/requests/admin/partners`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const partnersData = await partnersRes.json();
      if (!partnersRes.ok) throw new Error(partnersData.error || 'Failed to fetch partners');
      setPartners(partnersData);

      // 3. Fetch reported posts
      const postsRes = await fetch(`${apiBaseUrl}/media/admin/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const postsData = await postsRes.json();
      if (postsRes.ok) setReportedPosts(postsData);

      // 4. Fetch escalated chat sessions
      const chatsRes = await fetch(`${apiBaseUrl}/agent/admin/escalations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const chatsData = await chatsRes.json();
      if (chatsRes.ok) setChatSessions(chatsData);
    } catch (err) {
      console.error('❌ [Admin Fetch Error]:', err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial Fetch & 10s Silent Poll Interval
  useEffect(() => {
    fetchAdminData();
    
    const interval = setInterval(() => {
      fetchAdminData(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Display transient feedback messages
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Reassign Task
  const handleReassign = async () => {
    if (!reassignTicket || !selectedPartnerId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/requests/admin/reassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId: reassignTicket._id,
          partnerId: selectedPartnerId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reassignment failed');
      
      triggerToast(`Ticket ${reassignTicket._id.substring(reassignTicket._id.length - 6).toUpperCase()} reassigned successfully!`);
      setReassignModalVisible(false);
      setReassignTicket(null);
      setSelectedPartnerId('');
      fetchAdminData(true);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Suspend Task
  const handleSuspend = async (ticket) => {
    Alert.alert(
      'Confirm Suspension',
      `Are you sure you want to suspend technician assignment for ticket SF-${ticket._id.substring(ticket._id.length - 6).toUpperCase()}? This resets the status back to Pending.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend & Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await fetch(`${apiBaseUrl}/requests/admin/suspend`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requestId: ticket._id })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Suspension failed');
              
              triggerToast(`Assignment suspended for ticket SF-${ticket._id.substring(ticket._id.length - 6).toUpperCase()}!`);
              fetchAdminData(true);
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Create Job
  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.description || !newJob.latitude || !newJob.longitude) {
      Alert.alert('Missing Fields', 'Please complete all parameters to raise a ticket.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/requests/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: newJob.category,
          title: newJob.title,
          description: newJob.description,
          latitude: parseFloat(newJob.latitude),
          longitude: parseFloat(newJob.longitude)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create job');
      
      triggerToast(`Successfully raised new civic ticket!`);
      setAddJobModalVisible(false);
      setNewJob({
        title: '',
        category: 'garbage',
        description: '',
        latitude: '13.0827',
        longitude: '80.2707'
      });
      fetchAdminData(true);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Stats Calculations
  const totalTickets = requests.length;
  const pendingTickets = requests.filter(r => r.status === 'Pending').length;
  const ongoingTickets = requests.filter(r => ['Scheduled', 'In Progress'].includes(r.status)).length;
  const resolvedTickets = requests.filter(r => ['Resolved', 'Done'].includes(r.status)).length;
  const totalPartners = partners.length;

  // Filtered & Searched Tickets
  const filteredTickets = requests.filter(ticket => {
    // Status Filter
    if (ticketFilter !== 'All') {
      if (ticketFilter === 'Resolved') {
        if (!['Resolved', 'Done'].includes(ticket.status)) return false;
      } else if (ticket.status !== ticketFilter) {
        return false;
      }
    }
    
    // Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const refId = `SF-${ticket._id.substring(ticket._id.length - 6)}`.toLowerCase();
      const title = (ticket.title || '').toLowerCase();
      const category = (ticket.category || '').toLowerCase();
      const description = (ticket.description || '').toLowerCase();
      const citizenName = (ticket.user?.name || '').toLowerCase();
      const partnerName = (ticket.partner?.name || '').toLowerCase();
      
      return (
        refId.includes(query) ||
        title.includes(query) ||
        category.includes(query) ||
        description.includes(query) ||
        citizenName.includes(query) ||
        partnerName.includes(query)
      );
    }
    
    return true;
  });

  // Category Style Map
  const getCategoryStyles = (category) => {
    switch (category) {
      case 'garbage': return { bg: COLORS.successBg, text: COLORS.successText, label: 'Garbage Disposal' };
      case 'water': return { bg: COLORS.infoBg, text: COLORS.infoText, label: 'Water Leak/Flooding' };
      case 'electricity': return { bg: COLORS.warningBg, text: COLORS.warningText, label: 'Power Grid Hazard' };
      case 'roads': return { bg: COLORS.purpleBg, text: COLORS.purpleText, label: 'Road Repair/Pothole' };
      default: return { bg: COLORS.tealBg, text: COLORS.tealText, label: 'Other Grievance' };
    }
  };

  // Status Styling
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fee2e2', text: '#b91c1c', hex: '#ef4444' };
      case 'Assigned': return { bg: '#f5f3ff', text: '#6d28d9', hex: '#8b5cf6' };
      case 'Scheduled': return { bg: '#fef3c7', text: '#b45309', hex: '#f59e0b' };
      case 'In Progress': return { bg: '#eff6ff', text: '#1d4ed8', hex: '#3b82f6' };
      case 'Resolved': return { bg: '#d1fae5', text: '#065f46', hex: '#10b981' };
      case 'Done': return { bg: '#ecfdf5', text: '#047857', hex: '#059669' };
      case 'Escalated': return { bg: '#fff7ed', text: '#c2410c', hex: '#ea580c' };
      default: return { bg: '#f3f4f6', text: '#374151', hex: '#6b7280' };
    }
  };

  if (loading && requests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initializing Secure Command Center Dashboard...</Text>
      </View>
    );
  }

  // Individual card renderers to support both VirtualizedList (FlatList) on desktop and normal .map() on mobile
  // (resolves the "VirtualizedLists should never be nested inside plain ScrollViews" console warning)
  const renderTicketCard = (item) => {
    const catStyles = getCategoryStyles(item.category);
    const statStyle = getStatusColor(item.status);
    const refId = `SF-${item._id.substring(item._id.length - 6).toUpperCase()}`;

    return (
      <View key={item._id} style={styles.ticketCard}>
        <View style={styles.ticketCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.ticketRef}>{refId}</Text>
            <View style={[styles.catBadge, { backgroundColor: catStyles.bg }]}>
              <Text style={[styles.catBadgeText, { color: catStyles.text }]}>{catStyles.label}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statStyle.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.ticketTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.ticketDesc} numberOfLines={2}>{item.description}</Text>

        {/* Citizen and Technician populate */}
        <View style={styles.ticketPeople}>
          <View style={styles.personSubRow}>
            <User stroke={COLORS.textMuted} size={11} style={{ marginRight: 4 }} />
            <Text style={styles.peopleText}>Citizen: <Text style={{ fontWeight: '700' }}>{item.user?.name || 'Anonymous'}</Text></Text>
          </View>
          
          <View style={styles.personSubRow}>
            <Compass stroke={COLORS.textMuted} size={11} style={{ marginRight: 4 }} />
            <Text style={styles.peopleText}>Technician: <Text style={{ fontWeight: '700', color: item.partner ? COLORS.secondaryDark : COLORS.textMuted }}>{item.partner?.name || 'Unassigned'}</Text></Text>
            {item.partner?.phone ? (
              <Text style={styles.techPhone}> ({item.partner.phone})</Text>
            ) : null}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.ticketActionsRow}>
          <TouchableOpacity 
            style={styles.actionBtnOutline} 
            onPress={() => {
              setSelectedTicket(item);
              setDetailModalVisible(true);
            }}
          >
            <Eye stroke={COLORS.primary} size={12} style={{ marginRight: 5 }} />
            <Text style={styles.actionBtnOutlineText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtnOutline, { borderColor: COLORS.secondary }]} 
            onPress={() => {
              setReassignTicket(item);
              // Auto-match first available partner for selection
              const matchPartner = partners.find(p => p.partnerCategory === item.category && p.isAvailable);
              setSelectedPartnerId(matchPartner?._id || '');
              setReassignModalVisible(true);
            }}
          >
            <RefreshCw stroke={COLORS.secondary} size={12} style={{ marginRight: 5 }} />
            <Text style={[styles.actionBtnOutlineText, { color: COLORS.secondaryDark }]}>Reassign</Text>
          </TouchableOpacity>

          {item.partner && (
            <TouchableOpacity 
              style={[styles.actionBtnOutline, { borderColor: COLORS.danger }]} 
              onPress={() => handleSuspend(item)}
            >
              <X stroke={COLORS.danger} size={12} style={{ marginRight: 5 }} />
              <Text style={[styles.actionBtnOutlineText, { color: COLORS.danger }]}>Suspend</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPartnerCard = (item) => {
    const catStyles = getCategoryStyles(item.partnerCategory);
    const activeJobsCount = requests.filter(r => r.partner?._id === item._id && !['Resolved', 'Done'].includes(r.status)).length;
    
    return (
      <View key={item._id} style={styles.partnerCard}>
        <View style={styles.partnerHeader}>
          <View>
            <Text style={styles.partnerName}>{item.name}</Text>
            <Text style={styles.partnerEmail}>{item.email}</Text>
          </View>
          <View style={[styles.catBadge, { backgroundColor: catStyles.bg }]}>
            <Text style={[styles.catBadgeText, { color: catStyles.text }]}>{catStyles.label}</Text>
          </View>
        </View>

        <View style={styles.partnerStatsGrid}>
          <View style={styles.partnerStatItem}>
            <Phone stroke={COLORS.textMuted} size={12} style={{ marginRight: 5 }} />
            <Text style={styles.partnerStatValue}>{item.phone || 'N/A'}</Text>
          </View>
          
          <View style={styles.partnerStatItem}>
            <Award stroke="#eab308" size={12} style={{ marginRight: 5 }} />
            <Text style={styles.partnerStatValue}>{item.civicPoints || 0} pts ({item.badge || 'Silver'})</Text>
          </View>

          <View style={styles.partnerStatItem}>
            <Clock stroke={COLORS.primary} size={12} style={{ marginRight: 5 }} />
            <Text style={styles.partnerStatValue}>{activeJobsCount} Active Jobs</Text>
          </View>
          
          <View style={styles.partnerStatItem}>
            <View style={[styles.availabilityIndicator, { backgroundColor: item.isAvailable ? COLORS.success : COLORS.textMuted }]} />
            <Text style={styles.partnerStatValue}>{item.isAvailable ? 'Available' : 'Busy'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderModerationCard = (item) => (
    <View key={item._id} style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Post Content: {item.text}</Text>
      <Text style={{ color: COLORS.danger, marginBottom: 10 }}>Reports: {item.reports.length}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.danger, padding: 8, borderRadius: 5, flex: 1, alignItems: 'center' }}
          onPress={async () => {
            try {
              await fetch(`${apiBaseUrl}/media/posts/${item._id}/moderate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'remove' })
              });
              fetchAdminData(true);
              triggerToast('Post removed successfully.');
            } catch(e) {}
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Remove Post</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.textMuted, padding: 8, borderRadius: 5, flex: 1, alignItems: 'center' }}
          onPress={async () => {
            try {
              await fetch(`${apiBaseUrl}/media/posts/${item._id}/moderate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'ignore' })
              });
              fetchAdminData(true);
              triggerToast('Reports ignored.');
            } catch(e) {}
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ignore Reports</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Helper renderers to prevent code duplication between mobile and desktop panels
  const renderTicketsTabContent = () => (
    <View style={{ flex: 1 }}>
      {/* Search & Actions Panel */}
      <View style={styles.actionToolbar}>
        <View style={styles.searchWrapper}>
          <Search stroke={COLORS.textMuted} size={14} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search by ID, citizen, technician, category..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X stroke={COLORS.textMuted} size={14} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity style={styles.addJobBtn} onPress={() => setAddJobModalVisible(true)}>
          <Plus stroke="#ffffff" size={14} style={{ marginRight: 5 }} />
          <Text style={styles.addJobText}>Add Job</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Filter Capsule Buttons */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {['All', 'Pending', 'Assigned', 'Scheduled', 'In Progress', 'Resolved'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterCapsule, ticketFilter === filter && styles.filterCapsuleActive]}
              onPress={() => setTicketFilter(filter)}
            >
              <Text style={[styles.filterCapsuleText, ticketFilter === filter && styles.filterCapsuleTextActive]}>
                {filter === 'Resolved' ? 'Resolved/Done' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertCircle stroke={COLORS.textMuted} size={32} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>No municipal tickets match selected filters.</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.listContent}>
          {filteredTickets.map((item) => renderTicketCard(item))}
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => renderTicketCard(item)}
        />
      )}
    </View>
  );

  const renderPartnersTabContent = () => (
    <View style={{ flex: 1 }}>
      {partners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <UserCheck stroke={COLORS.textMuted} size={32} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>No registered technicians.</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.listContent}>
          {partners.map((item) => renderPartnerCard(item))}
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => renderPartnerCard(item)}
        />
      )}
    </View>
  );

  const renderModerationTabContent = () => (
    <View style={{ flex: 1, padding: 10 }}>
      {reportedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Shield stroke={COLORS.textMuted} size={32} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>No reported posts to moderate.</Text>
        </View>
      ) : isMobile ? (
        <View style={{ paddingBottom: 20 }}>
          {reportedPosts.map((item) => renderModerationCard(item))}
        </View>
      ) : (
        <FlatList
          data={reportedPosts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => renderModerationCard(item)}
        />
      )}
    </View>
  );



  // Pre-sort partners for reassignment modal: ones matching the ticket category first!
  const sortedPartnersForReassign = reassignTicket
    ? [
        ...partners.filter(p => p.partnerCategory === reassignTicket.category),
        ...partners.filter(p => p.partnerCategory !== reassignTicket.category)
      ]
    : partners;

  return (
    <View style={styles.container}>
      {/* 1. Dashboard Top Header Bar */}
      <View style={[styles.headerBar, isMobile && { paddingHorizontal: 10, height: 60 }]}>
        <View style={styles.headerLeft}>
          <Shield stroke={COLORS.primary} size={20} style={{ marginRight: 6 }} />
          <View>
            <Text style={[styles.headerTitle, isMobile && { fontSize: 15, letterSpacing: 0.8 }]}>SMART FIX</Text>
            {!isMobile && <Text style={styles.headerSubtitle}>Municipal Administration Command Console</Text>}
          </View>
        </View>
        
        {/* Toast Display */}
        {toastMessage && (
          <View style={[styles.toastContainer, isMobile && { paddingVertical: 5, paddingHorizontal: 8 }]}>
            <CheckCircle stroke="#ffffff" size={12} style={{ marginRight: 4 }} />
            <Text style={[styles.toastText, isMobile && { fontSize: 10 }]}>{toastMessage}</Text>
          </View>
        )}

        <View style={styles.headerRight}>
          <View style={[styles.profileBadge, isMobile && { paddingRight: 8 }]}>
            <View style={[styles.avatarMini, isMobile && { width: 28, height: 28, borderRadius: 14, marginRight: 4 }]}>
              <Text style={[styles.avatarMiniText, isMobile && { fontSize: 10 }]}>AD</Text>
            </View>
            {!isMobile && (
              <View style={{ marginRight: 15 }}>
                <Text style={styles.profileName}>Admin Portal</Text>
                <Text style={styles.profileRole}>admin@gmail.com</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.logoutBtn, isMobile && { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6 }]} onPress={logout}>
            <LogOut stroke="#ffffff" size={14} style={{ marginRight: isMobile ? 0 : 4 }} />
            {!isMobile && <Text style={styles.logoutBtnText}>Logout Session</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Stat scorecards row */}
      {isMobile ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.statsScrollMobile}
          contentContainerStyle={styles.statsScrollContentMobile}
        >
          <View style={styles.statCardMobile}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#eff6ff', width: 32, height: 32, marginRight: 8 }]}>
              <FileText stroke="#1d4ed8" size={15} />
            </View>
            <View>
              <Text style={styles.statValMobile}>{totalTickets}</Text>
              <Text style={styles.statLabelMobile}>Total Complaints</Text>
            </View>
          </View>

          <View style={styles.statCardMobile}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#fee2e2', width: 32, height: 32, marginRight: 8 }]}>
              <AlertCircle stroke="#b91c1c" size={15} />
            </View>
            <View>
              <Text style={styles.statValMobile}>{pendingTickets}</Text>
              <Text style={styles.statLabelMobile}>Pending/Unassigned</Text>
            </View>
          </View>

          <View style={styles.statCardMobile}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#fef3c7', width: 32, height: 32, marginRight: 8 }]}>
              <Clock stroke="#b45309" size={15} />
            </View>
            <View>
              <Text style={styles.statValMobile}>{ongoingTickets}</Text>
              <Text style={styles.statLabelMobile}>Active Repair Tasks</Text>
            </View>
          </View>

          <View style={styles.statCardMobile}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#d1fae5', width: 32, height: 32, marginRight: 8 }]}>
              <CheckCircle stroke="#065f46" size={15} />
            </View>
            <View>
              <Text style={styles.statValMobile}>{resolvedTickets}</Text>
              <Text style={styles.statLabelMobile}>Resolved Issues</Text>
            </View>
          </View>

          <View style={styles.statCardMobile}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#f5f3ff', width: 32, height: 32, marginRight: 8 }]}>
              <UserCheck stroke="#6d28d9" size={15} />
            </View>
            <View>
              <Text style={styles.statValMobile}>{totalPartners}</Text>
              <Text style={styles.statLabelMobile}>Technicians</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#eff6ff' }]}>
              <FileText stroke="#1d4ed8" size={18} />
            </View>
            <View>
              <Text style={styles.statVal}>{totalTickets}</Text>
              <Text style={styles.statLabel}>Total Complaints Raised</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#fee2e2' }]}>
              <AlertCircle stroke="#b91c1c" size={18} />
            </View>
            <View>
              <Text style={styles.statVal}>{pendingTickets}</Text>
              <Text style={styles.statLabel}>Pending/Unassigned</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#fef3c7' }]}>
              <Clock stroke="#b45309" size={18} />
            </View>
            <View>
              <Text style={styles.statVal}>{ongoingTickets}</Text>
              <Text style={styles.statLabel}>Active Repair Tasks</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#d1fae5' }]}>
              <CheckCircle stroke="#065f46" size={18} />
            </View>
            <View>
              <Text style={styles.statVal}>{resolvedTickets}</Text>
              <Text style={styles.statLabel}>Resolved & Closed Issues</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#f5f3ff' }]}>
              <UserCheck stroke="#6d28d9" size={18} />
            </View>
            <View>
              <Text style={styles.statVal}>{totalPartners}</Text>
              <Text style={styles.statLabel}>Registered Technicians</Text>
            </View>
          </View>
        </View>
      )}

      {/* 3. Grid Layout (Scrollable on Mobile, Flex Split on Widescreen) */}
      {isMobile ? (
        <ScrollView style={styles.mobileMainScroll} contentContainerStyle={styles.mobileMainScrollContent}>
          {/* Map Panel (Stacked at the top) */}
          <View style={styles.leftPanelMobile}>
            <View style={styles.panelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Map stroke={COLORS.primary} size={16} style={{ marginRight: 6 }} />
                <Text style={styles.panelTitle}>City Service Mapping Telemetry</Text>
              </View>
              <TouchableOpacity style={styles.refreshBadgeBtn} onPress={() => fetchAdminData(true)}>
                <RefreshCw stroke={COLORS.textMuted} size={11} style={{ marginRight: 4 }} />
                <Text style={styles.refreshBadgeText}>Syncing Live</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.mapContainer, { minHeight: 300, height: 300 }]}>
              <LeafletMap readOnly={true} issues={requests} />
            </View>

            {/* Map Legend details */}
            <View style={[styles.legendContainer, { marginTop: 8, padding: 8 }]}>
              <Text style={styles.legendTitle}>Map Pins Legend:</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendLabelText}>Pending</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#8b5cf6' }]} />
                  <Text style={styles.legendLabelText}>Assigned</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.legendLabelText}>Scheduled</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendLabelText}>In Progress</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendLabelText}>Resolved/Done</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Directory Panel (Stacked below the map) */}
          <View style={styles.rightPanelMobile}>
            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileTabsScroll}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'tickets' && styles.tabButtonActive, { paddingHorizontal: 12, marginRight: 6 }]}
                onPress={() => setActiveTab('tickets')}
              >
                <FileText stroke={activeTab === 'tickets' ? COLORS.primary : COLORS.textMuted} size={13} style={{ marginRight: 4 }} />
                <Text style={[styles.tabButtonText, activeTab === 'tickets' && styles.tabButtonTextActive, { fontSize: 11 }]}>Complaints ({totalTickets})</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'partners' && styles.tabButtonActive, { paddingHorizontal: 12, marginRight: 6 }]}
                onPress={() => setActiveTab('partners')}
              >
                <UserCheck stroke={activeTab === 'partners' ? COLORS.primary : COLORS.textMuted} size={13} style={{ marginRight: 4 }} />
                <Text style={[styles.tabButtonText, activeTab === 'partners' && styles.tabButtonTextActive, { fontSize: 11 }]}>Technicians ({totalPartners})</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'moderation' && styles.tabButtonActive, { paddingHorizontal: 12, marginRight: 6 }]}
                onPress={() => setActiveTab('moderation')}
              >
                <Shield stroke={activeTab === 'moderation' ? COLORS.primary : COLORS.textMuted} size={13} style={{ marginRight: 4 }} />
                <Text style={[styles.tabButtonText, activeTab === 'moderation' && styles.tabButtonTextActive, { fontSize: 11 }]}>Moderation</Text>
              </TouchableOpacity>


            </ScrollView>

            {/* Content Blocks */}
            {activeTab === 'tickets' && renderTicketsTabContent()}
            {activeTab === 'partners' && renderPartnersTabContent()}
            {activeTab === 'moderation' && renderModerationTabContent()}

          </View>
        </ScrollView>
      ) : (
        <View style={styles.mainGrid}>
          {/* Left Grid Panel: Interactive Leaflet Map Viewer */}
          <View style={styles.leftPanel}>
            <View style={styles.panelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Map stroke={COLORS.primary} size={18} style={{ marginRight: 8 }} />
                <Text style={styles.panelTitle}>City Service Mapping Telemetry</Text>
              </View>
              <TouchableOpacity style={styles.refreshBadgeBtn} onPress={() => fetchAdminData(true)}>
                <RefreshCw stroke={COLORS.textMuted} size={13} style={{ marginRight: 4 }} />
                <Text style={styles.refreshBadgeText}>Syncing Live</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.mapContainer}>
              <LeafletMap readOnly={true} issues={requests} />
            </View>

            {/* Map Color Legend details */}
            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>Map Pins Legend:</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendLabelText}>Pending</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#8b5cf6' }]} />
                  <Text style={styles.legendLabelText}>Assigned</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.legendLabelText}>Scheduled</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendLabelText}>In Progress</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendLabelText}>Resolved/Done</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Grid Panel: Directory Table & Search Console */}
          <View style={styles.rightPanel}>
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'tickets' && styles.tabButtonActive]}
                onPress={() => setActiveTab('tickets')}
              >
                <FileText stroke={activeTab === 'tickets' ? COLORS.primary : COLORS.textMuted} size={15} style={{ marginRight: 6 }} />
                <Text style={[styles.tabButtonText, activeTab === 'tickets' && styles.tabButtonTextActive]}>Municipal Complaints ({totalTickets})</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'partners' && styles.tabButtonActive]}
                onPress={() => setActiveTab('partners')}
              >
                <UserCheck stroke={activeTab === 'partners' ? COLORS.primary : COLORS.textMuted} size={15} style={{ marginRight: 6 }} />
                <Text style={[styles.tabButtonText, activeTab === 'partners' && styles.tabButtonTextActive]}>Technicians ({totalPartners})</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'moderation' && styles.tabButtonActive]}
                onPress={() => setActiveTab('moderation')}
              >
                <Shield stroke={activeTab === 'moderation' ? COLORS.primary : COLORS.textMuted} size={15} style={{ marginRight: 6 }} />
                <Text style={[styles.tabButtonText, activeTab === 'moderation' && styles.tabButtonTextActive]}>Moderation</Text>
              </TouchableOpacity>


            </View>

            {/* Content Blocks */}
            {activeTab === 'tickets' && renderTicketsTabContent()}
            {activeTab === 'partners' && renderPartnersTabContent()}
            {activeTab === 'moderation' && renderModerationTabContent()}

          </View>
        </View>
      )}

      {/* 4. Complete Detailed Ticket Modal Overlay */}
      {selectedTicket && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={detailModalVisible}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.largeModalCard, isMobile && { width: '96%', height: '94%', maxHeight: windowHeight * 0.95 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Shield stroke={COLORS.primary} size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>TICKET METRICS & TELEMETRY CONTROL</Text>
                </View>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setDetailModalVisible(false)}>
                  <X stroke={COLORS.text} size={20} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                {/* Reference, status and category grid */}
                <View style={[styles.detailSegmentRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
                  <View style={styles.detailDataField}>
                    <Text style={styles.detailLabel}>Reference ID</Text>
                    <Text style={styles.detailValueLarge}>SF-{selectedTicket._id.toUpperCase()}</Text>
                  </View>
                  
                  <View style={styles.detailDataField}>
                    <Text style={styles.detailLabel}>Lifespan Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTicket.status).bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedTicket.status).text, fontSize: 13 }]}>{selectedTicket.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDataField}>
                    <Text style={styles.detailLabel}>Specialty Category</Text>
                    <View style={[styles.catBadge, { backgroundColor: getCategoryStyles(selectedTicket.category).bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={[styles.catBadgeText, { color: getCategoryStyles(selectedTicket.category).text, fontSize: 13 }]}>{getCategoryStyles(selectedTicket.category).label}</Text>
                    </View>
                  </View>
                </View>

                {/* Complaint Title & description */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeaderTitle}>Grievance Description</Text>
                  <View style={styles.descContainer}>
                    <Text style={styles.detailTitleField}>{selectedTicket.title}</Text>
                    <Text style={styles.detailDescField}>{selectedTicket.description}</Text>
                  </View>
                </View>

                {/* Grid Split: Citizen / Location vs Technician / Telemetry */}
                <View style={[styles.splitDetailsGrid, isMobile && { flexDirection: 'column', gap: 15 }]}>
                  {/* Left split: Citizens & Geocodes */}
                  <View style={styles.splitColumn}>
                    <Text style={styles.sectionHeaderTitle}>Citizen Contact Info</Text>
                    <View style={styles.cardDetailsInside}>
                      <View style={styles.insideDataRow}>
                        <User stroke={COLORS.primary} size={14} style={{ marginRight: 8 }} />
                        <Text style={styles.insideDataText}>Reporter Name: <Text style={{ fontWeight: '700' }}>{selectedTicket.user?.name || 'Anonymous'}</Text></Text>
                      </View>
                      
                      <View style={styles.insideDataRow}>
                        <Mail stroke={COLORS.primary} size={14} style={{ marginRight: 8 }} />
                        <Text style={styles.insideDataText}>Email Account: <Text style={{ fontWeight: '700' }}>{selectedTicket.user?.email || 'N/A'}</Text></Text>
                      </View>

                      <View style={styles.insideDataRow}>
                        <MapPin stroke={COLORS.primary} size={14} style={{ marginRight: 8 }} />
                        <Text style={styles.insideDataText}>GPS Coordinates: <Text style={{ fontWeight: '700', fontFamily: 'monospace' }}>{selectedTicket.latitude.toFixed(6)}, {selectedTicket.longitude.toFixed(6)}</Text></Text>
                      </View>

                      <View style={styles.insideDataRow}>
                        <Calendar stroke={COLORS.primary} size={14} style={{ marginRight: 8 }} />
                        <Text style={styles.insideDataText}>Raised Date: <Text style={{ fontWeight: '700' }}>{new Date(selectedTicket.createdAt).toLocaleString()}</Text></Text>
                      </View>
                    </View>

                    {/* Citizen Attachment Photo */}
                    <Text style={styles.sectionHeaderTitle}>Citizen Incident Attachment</Text>
                    <View style={styles.imageContainerBox}>
                      {selectedTicket.citizenImage ? (
                        <Image 
                          source={{ uri: selectedTicket.citizenImage }} 
                          style={styles.telemetryImage} 
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.noImagePlaceholder}>
                          <AlertTriangle stroke={COLORS.textMuted} size={28} style={{ marginBottom: 6 }} />
                          <Text style={styles.noImagePlaceholderText}>No citizen photo attached to this complaint</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Right split: Partner Technicians & Completion Proof */}
                  <View style={styles.splitColumn}>
                    <Text style={styles.sectionHeaderTitle}>Assigned Technician</Text>
                    <View style={styles.cardDetailsInside}>
                      {selectedTicket.partner ? (
                        <>
                          <View style={styles.insideDataRow}>
                            <Building stroke={COLORS.secondary} size={14} style={{ marginRight: 8 }} />
                            <Text style={styles.insideDataText}>Technician: <Text style={{ fontWeight: '700' }}>{selectedTicket.partner.name}</Text></Text>
                          </View>
                          
                          <View style={styles.insideDataRow}>
                            <Mail stroke={COLORS.secondary} size={14} style={{ marginRight: 8 }} />
                            <Text style={styles.insideDataText}>Email: <Text style={{ fontWeight: '700' }}>{selectedTicket.partner.email}</Text></Text>
                          </View>

                          <View style={styles.insideDataRow}>
                            <Phone stroke={COLORS.secondary} size={14} style={{ marginRight: 8 }} />
                            <Text style={styles.insideDataText}>Phone Number: <Text style={{ fontWeight: '700', color: COLORS.primary }}>{selectedTicket.partner.phone || 'Not Registered'}</Text></Text>
                          </View>

                          <View style={styles.insideDataRow}>
                            <Clock stroke={COLORS.secondary} size={14} style={{ marginRight: 8 }} />
                            <Text style={styles.insideDataText}>Assigned Time: <Text style={{ fontWeight: '700' }}>{selectedTicket.assignedAt ? new Date(selectedTicket.assignedAt).toLocaleString() : 'N/A'}</Text></Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.unassignedOverlayDetail}>
                          <AlertCircle stroke={COLORS.textMuted} size={18} style={{ marginRight: 8 }} />
                          <Text style={styles.unassignedOverlayText}>No municipal service partner currently assigned to this ticket.</Text>
                        </View>
                      )}
                    </View>

                    {/* Completion Telemetry */}
                    <Text style={styles.sectionHeaderTitle}>Technician Resolution & Proof</Text>
                    <View style={styles.imageContainerBox}>
                      {selectedTicket.resolutionImage ? (
                        <View style={{ flex: 1 }}>
                          <Image 
                            source={{ uri: selectedTicket.resolutionImage }} 
                            style={[styles.telemetryImage, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]} 
                            resizeMode="cover"
                          />
                          <View style={styles.telemetryInfoBar}>
                            <Text style={styles.telemetryInfoText}>GPS Verification Coordinates: {selectedTicket.resolutionLatitude?.toFixed(6)}, {selectedTicket.resolutionLongitude?.toFixed(6)}</Text>
                            <Text style={styles.telemetryInfoText}>Location: {selectedTicket.resolutionLocationName || 'Site Verified'}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.noImagePlaceholder}>
                          <Wrench stroke={COLORS.textMuted} size={28} style={{ marginBottom: 6 }} />
                          <Text style={styles.noImagePlaceholderText}>Repair not yet marked resolved / no proof uploaded</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Rating & Review segment if ticket is Done/Resolved */}
                {selectedTicket.rating ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeaderTitle}>Citizen Feedback Rating Review</Text>
                    <View style={styles.feedbackCardReview}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            fill={star <= selectedTicket.rating ? '#f59e0b' : 'none'} 
                            stroke="#f59e0b" 
                            size={16} 
                            style={{ marginRight: 3 }}
                          />
                        ))}
                        <Text style={styles.ratingBadgeValue}>({selectedTicket.rating} / 5 stars)</Text>
                      </View>
                      <Text style={styles.ratingComment}>"{selectedTicket.feedback || 'No written comments submitted.'}"</Text>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeFooterBtn} onPress={() => setDetailModalVisible(false)}>
                  <Text style={styles.closeFooterBtnText}>Dismiss Telemetry Screen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 5. Reassign Modal Picker (Refactored to Custom Premium Cross-platform Selector) */}
      {reassignTicket && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={reassignModalVisible}
          onRequestClose={() => setReassignModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.mediumModalCard, { maxHeight: windowHeight * 0.85 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>REASSIGN MUNICIPAL TICKET</Text>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setReassignModalVisible(false)}>
                  <X stroke={COLORS.text} size={18} />
                </TouchableOpacity>
              </View>

              <View style={[styles.modalFormBody, { flex: 1, display: 'flex', flexDirection: 'column' }]}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.formInputLabel}>Ticket Ref ID: <Text style={{ color: COLORS.primary, fontWeight: '800' }}>SF-{reassignTicket._id.substring(reassignTicket._id.length - 6).toUpperCase()}</Text></Text>
                  <Text style={styles.formInputLabel}>Ticket Category: <Text style={{ color: COLORS.secondaryDark, fontWeight: '800' }}>{reassignTicket.category.toUpperCase()}</Text></Text>
                  <Text style={[styles.formInputLabel, { marginTop: 10 }]}>Select Technician Provider below:</Text>
                </View>

                {/* Grouped Selectable List */}
                <ScrollView style={styles.customPickerScrollView}>
                  {sortedPartnersForReassign.map((p) => {
                    const isSelected = selectedPartnerId === p._id;
                    const matchesCategory = p.partnerCategory === reassignTicket.category;
                    const catStyles = getCategoryStyles(p.partnerCategory);
                    
                    return (
                      <TouchableOpacity
                        key={p._id}
                        style={[
                          styles.pickerPartnerRow,
                          isSelected && styles.pickerPartnerRowSelected,
                          matchesCategory && { borderColor: 'rgba(99, 102, 241, 0.25)' }
                        ]}
                        onPress={() => setSelectedPartnerId(p._id)}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={styles.pickerPartnerName}>{p.name}</Text>
                            {matchesCategory && (
                              <View style={styles.matchBadge}>
                                <Text style={styles.matchBadgeText}>Specialist Match</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.pickerPartnerMeta}>{p.email} | {p.phone || 'No phone'}</Text>
                          <Text style={styles.pickerPartnerStats}>{p.civicPoints || 0} PTS ({p.badge || 'Silver'}) | Status: {p.isAvailable ? 'Available' : 'Busy'}</Text>
                        </View>
                        
                        <View style={[styles.pickerCheckbox, isSelected && styles.pickerCheckboxActive]}>
                          {isSelected && <Check stroke="#ffffff" size={12} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
                ) : (
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReassignModalVisible(false)}>
                      <Text style={styles.modalBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.modalBtnConfirm, !selectedPartnerId && { opacity: 0.6 }]} 
                      onPress={handleReassign}
                      disabled={!selectedPartnerId}
                    >
                      <Text style={styles.modalBtnConfirmText}>Reassign Technician</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 6. Add Job Modal Dialog Form */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addJobModalVisible}
        onRequestClose={() => setAddJobModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.mediumModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <UserPlus stroke={COLORS.primary} size={18} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>ADD NEW CIVIC SERVICE COMPLAINT</Text>
              </View>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setAddJobModalVisible(false)}>
                <X stroke={COLORS.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formInputLabel}>Complaint Title</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter a brief, scannable title (e.g. Water logging, Odor)"
                  placeholderTextColor={COLORS.textMuted}
                  value={newJob.title}
                  onChangeText={(text) => setNewJob({ ...newJob, title: text })}
                />
              </View>

              {/* Refactored Category Picker to Beautiful Capsules */}
              <View style={styles.formGroup}>
                <Text style={styles.formInputLabel}>Service Category Domain</Text>
                <View style={styles.capsuleGroupRow}>
                  {[
                    { key: 'garbage', label: 'Garbage' },
                    { key: 'water', label: 'Water Leak' },
                    { key: 'electricity', label: 'Electricity' },
                    { key: 'roads', label: 'Road/Pothole' },
                    { key: 'other', label: 'Other' }
                  ].map((cat) => {
                    const isSelected = newJob.category === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.categoryFormCapsule, isSelected && styles.categoryFormCapsuleActive]}
                        onPress={() => setNewJob({ ...newJob, category: cat.key })}
                      >
                        <Text style={[styles.categoryFormCapsuleText, isSelected && styles.categoryFormCapsuleTextActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formInputLabel}>Detailed Description of Issue</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Provide precise location landmarks and descriptions to assist technician repairs on site."
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={4}
                  value={newJob.description}
                  onChangeText={(text) => setNewJob({ ...newJob, description: text })}
                />
              </View>

              <View style={styles.formCoordinatesRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formInputLabel}>Latitude Geocode</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="13.0827"
                    placeholderTextColor={COLORS.textMuted}
                    value={newJob.latitude}
                    onChangeText={(text) => setNewJob({ ...newJob, latitude: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formInputLabel}>Longitude Geocode</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="80.2707"
                    placeholderTextColor={COLORS.textMuted}
                    value={newJob.longitude}
                    onChangeText={(text) => setNewJob({ ...newJob, longitude: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {actionLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 15 }} />
              ) : (
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setAddJobModalVisible(false)}>
                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleCreateJob}>
                    <Text style={styles.modalBtnConfirmText}>Raise Ticket</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Inline custom sub-components
const Wrench = ({ stroke, size, style }) => (
  <svg style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
  </svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Premium dark background
    width: '100%',
    height: '100%'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 15
  },
  headerBar: {
    height: 70,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1
  },
  toastContainer: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  toastText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingRight: 15
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  avatarMiniText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  profileName: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800'
  },
  profileRole: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 15,
    transition: 'all 0.2s ease'
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800'
  },
  statsRow: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  statIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 24
  },
  statLabel: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2
  },
  mainGrid: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    padding: 15,
    gap: 15,
    height: 'calc(100% - 150px)'
  },
  leftPanel: {
    flex: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    height: '100%',
    justifyContent: 'space-between'
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  panelTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.3
  },
  refreshBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20
  },
  refreshBadgeText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '700'
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    minHeight: 350
  },
  legendContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)'
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6
  },
  legendLabelText: {
    fontSize: 10.5,
    color: '#e2e8f0',
    fontWeight: '600'
  },
  rightPanel: {
    flex: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10
  },
  tabButtonActive: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  tabButtonTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38
  },
  searchBar: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'transparent',
    borderWidth: 0,
    outline: 'none'
  },
  addJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6
  },
  addJobText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  filtersScroll: {
    flexGrow: 0,
    marginBottom: 12
  },
  filterCapsule: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterCapsuleActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary
  },
  filterCapsuleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700'
  },
  filterCapsuleTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  listContent: {
    paddingBottom: 20
  },
  ticketCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ticketRef: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'monospace',
    marginRight: 8
  },
  catBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '850'
  },
  ticketTitle: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 4
  },
  ticketDesc: {
    color: '#94a3b8',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 10
  },
  ticketPeople: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    gap: 5,
    marginBottom: 12
  },
  personSubRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  peopleText: {
    fontSize: 10.5,
    color: '#cbd5e1'
  },
  techPhone: {
    fontSize: 10.5,
    color: COLORS.primary,
    fontWeight: '700'
  },
  ticketActionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent'
  },
  actionBtnOutlineText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '800'
  },
  partnerCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginBottom: 10
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  partnerName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff'
  },
  partnerEmail: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1
  },
  partnerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    paddingTop: 10
  },
  partnerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100
  },
  partnerStatValue: {
    fontSize: 11,
    color: '#e2e8f0',
    fontWeight: '600'
  },
  availabilityIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  largeModalCard: {
    width: '90%',
    maxWidth: 960,
    height: '90%',
    maxHeight: 760,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20
  },
  mediumModalCard: {
    width: '90%',
    maxWidth: 580,
    maxHeight: '85%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden'
  },
  smallModalCard: {
    width: '90%',
    maxWidth: 440,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  modalTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.8
  },
  closeModalBtn: {
    padding: 5
  },
  modalScrollContent: {
    padding: 20
  },
  detailSegmentRow: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 15,
    marginBottom: 20
  },
  detailDataField: {
    flex: 1
  },
  detailLabel: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  detailValueLarge: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
    fontFamily: 'monospace'
  },
  detailSection: {
    marginBottom: 20
  },
  sectionHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '850',
    color: '#cbd5e1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  descContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    padding: 15
  },
  detailTitleField: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8
  },
  detailDescField: {
    fontSize: 12.5,
    color: '#94a3b8',
    lineHeight: 18
  },
  splitDetailsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20
  },
  splitColumn: {
    flex: 1
  },
  cardDetailsInside: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    padding: 15,
    gap: 10,
    marginBottom: 15,
    minHeight: 140
  },
  insideDataRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  insideDataText: {
    fontSize: 12,
    color: '#cbd5e1'
  },
  unassignedOverlayDetail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100
  },
  unassignedOverlayText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16
  },
  imageContainerBox: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    height: 180,
    overflow: 'hidden'
  },
  telemetryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14
  },
  telemetryInfoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.85)',
    padding: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  telemetryInfoText: {
    color: '#e2e8f0',
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15
  },
  noImagePlaceholderText: {
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center'
  },
  feedbackCardReview: {
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 14,
    padding: 15
  },
  ratingBadgeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    marginLeft: 6
  },
  ratingComment: {
    fontSize: 12.5,
    color: '#cbd5e1',
    fontStyle: 'italic',
    lineHeight: 18
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'flex-end',
    backgroundColor: '#0f172a'
  },
  closeFooterBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  closeFooterBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  modalFormBody: {
    padding: 20
  },
  formInputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10
  },
  modalBtnCancelText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700'
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10
  },
  modalBtnConfirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  formGroup: {
    marginBottom: 15
  },
  modalTextInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    outline: 'none'
  },
  formCoordinatesRow: {
    flexDirection: 'row',
    marginBottom: 5
  },
  
  // Custom Selectable Picker Styles
  customPickerScrollView: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    marginVertical: 10,
    minHeight: 200,
    maxHeight: 300
  },
  pickerPartnerRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  pickerPartnerRowSelected: {
    backgroundColor: 'rgba(219, 39, 119, 0.08)',
    borderColor: COLORS.primary
  },
  pickerPartnerName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  pickerPartnerMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2
  },
  pickerPartnerStats: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600'
  },
  pickerCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pickerCheckboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  matchBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 0.5,
    borderColor: '#10b981',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 8
  },
  matchBadgeText: {
    color: '#10b981',
    fontSize: 8.5,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  
  // Custom Capsule Selectors for Forms
  capsuleGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  categoryFormCapsule: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  categoryFormCapsuleActive: {
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primary
  },
  categoryFormCapsuleText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700'
  },
  categoryFormCapsuleTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  },
  
  // Mobile responsive layout extensions
  mobileMainScroll: {
    flex: 1,
    width: '100%'
  },
  mobileMainScrollContent: {
    padding: 10,
    paddingBottom: 40
  },
  leftPanelMobile: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    width: '100%',
    marginBottom: 15
  },
  rightPanelMobile: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
    width: '100%',
    minHeight: 550,
    height: 600,
    display: 'flex',
    flexDirection: 'column'
  },
  mobileTabsScroll: {
    flexGrow: 0,
    marginBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)'
  },
  statsScrollMobile: {
    maxHeight: 75,
    flexGrow: 0,
    marginVertical: 10,
    paddingHorizontal: 10
  },
  statsScrollContentMobile: {
    gap: 8,
    paddingRight: 20,
    alignItems: 'center'
  },
  statCardMobile: {
    height: 52,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150
  },
  statValMobile: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 18
  },
  statLabelMobile: {
    fontSize: 9.5,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 1
  }
});
