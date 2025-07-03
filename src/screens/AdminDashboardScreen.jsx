import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuth} from '../context/AuthContext';
import api from '../services/api';
import {adminService} from '../services/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
const AdminDashboardScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const {user} = useAuth();
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPharma: 0,
    pendingEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCoursesCount, setPendingCoursesCount] = useState(0);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const data = await adminService.getDashboardStats();

      setStats({
        totalDoctors: data.totalDoctors || 0,
        totalPharma: data.totalPharma || 0,
        pendingEvents: data.pendingEvents || 0,
      });

      // Fetch pending courses count
      const coursesData = await adminService.getPendingCoursesCount();
      setPendingCoursesCount(coursesData.count || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep previous stats or set defaults
      setStats(
        prevStats =>
          prevStats || {
            totalDoctors: 0,
            totalPharma: 0,
            pendingEvents: 0,
          },
      );

      // Alert user of error if this isn't just an initial load
      if (!loading) {
        Alert.alert(
          'Error Loading Data',
          'Could not load the latest dashboard statistics. Please try again later.',
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7af5" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9fc" />
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Admin Dashboard</Text>
          <Text style={styles.subtitleText}>
            Welcome, {user?.name || 'Administrator'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('AdminProfile')}>
          <Icon name="account-circle" size={28} color="#2e7af5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => navigation.navigate('DoctorManagement')}>
            <View style={[styles.iconContainer, {backgroundColor: '#e3f2fd'}]}>
              <Icon name="doctor" size={28} color="#1976d2" />
            </View>
            <Text style={styles.statsValue}>{stats.totalDoctors}</Text>
            <Text style={styles.statsLabel}>Registered Doctors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => navigation.navigate('PharmaManagement')}>
            <View style={[styles.iconContainer, {backgroundColor: '#e8f5e9'}]}>
              <Icon name="pill" size={28} color="#2e7d32" />
            </View>
            <Text style={styles.statsValue}>{stats.totalPharma}</Text>
            <Text style={styles.statsLabel}>Pharmaceutical Reps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => navigation.navigate('EventApproval')}>
            <View style={[styles.iconContainer, {backgroundColor: '#fff3e0'}]}>
              <Icon name="calendar-clock" size={28} color="#e65100" />
            </View>
            <Text style={styles.statsValue}>{stats.pendingEvents}</Text>
            <Text style={styles.statsLabel}>Pending Events</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('EventApproval')}>
            <Icon name="calendar-check" size={24} color="#2e7af5" />
            <Text style={styles.quickActionText}>Review Event Requests</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('UserVerification')}>
            <Icon name="account-check" size={24} color="#2e7af5" />
            <Text style={styles.quickActionText}>Verify Users</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('ContentManagement')}>
            <Icon name="file-document-edit" size={24} color="#2e7af5" />
            <Text style={styles.quickActionText}>Manage Content</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('SystemSettings')}>
            <Icon name="cog" size={24} color="#2e7af5" />
            <Text style={styles.quickActionText}>System Settings</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity> */}
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AdminChat')}>
            <Icon name="forum" size={24} color="#2e7af5" />
            <Text style={styles.quickActionText}>Support Chats</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AdminEventManagement')}>
            <Icon name="calendar-multiple" size={24} color="#2e7af5" />
            <Text style={styles.quickActionText}>Manage All Events</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AdminPrivateMeetings')}>
            <Icon name="calendar-lock" size={24} color="#2e7af5" />
            <Text style={styles.quickActionText}>Private Meetings</Text>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Courses</Text>
        </View>

        <TouchableOpacity
          style={styles.dashboardCard}
          onPress={() => navigation.navigate('PendingCourses')}>
          <View style={styles.dashboardIconContainer}>
            <Icon name="book-clock" size={24} color="#2e7af5" />
            {pendingCoursesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCoursesCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.dashboardCardTitle}>Pending Courses</Text>
          <Text style={styles.dashboardCardSubtitle}>
            {pendingCoursesCount} course{pendingCoursesCount === 1 ? '' : 's'}{' '}
            awaiting review
          </Text>
        </TouchableOpacity>

        {/* <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityContainer}>
          <View style={styles.activityItem}>
            <View style={styles.activityIconContainer}>
              <Icon name="account-plus" size={20} color="#fff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.bold}>Dr. Sarah Johnson</Text> joined as a new healthcare provider
              </Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityIconContainer, {backgroundColor: '#e65100'}]}>
              <Icon name="calendar-plus" size={20} color="#fff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.bold}>Cardiology Summit 2025</Text> event submitted for approval
              </Text>
              <Text style={styles.activityTime}>Yesterday</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityIconContainer, {backgroundColor: '#2e7d32'}]}>
              <Icon name="check-circle" size={20} color="#fff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.bold}>Pharma Connect Event</Text> was approved by admin
              </Text>
              <Text style={styles.activityTime}>2 days ago</Text>
            </View>
          </View>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    //paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f7f9fc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2e7af5',
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  bold: {
    fontWeight: 'bold',
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dashboardIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#e53935',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dashboardCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dashboardCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default AdminDashboardScreen;
